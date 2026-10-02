# Research & Architectural Decisions: Mecanismo de Backup Externo e Rotinas Programáveis

**Feature**: `005-external-data-backup`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Estratégia de Cópia Consistente da Base de Dados SQLite

### Contexto
O aplicativo Minhas Horas utiliza SQLite com WAL mode (`journal_mode = WAL`) através da biblioteca `better-sqlite3`. Uma cópia direta de arquivos via sistema operacional (`fs.copyFile`) pode capturar um estado intermediário inconsistente se houver transações abertas escrevendo nos arquivos `-wal` e `-shm`.

### Decisão
Utilizar a API nativa de backup do SQLite disponibilizada pelo `better-sqlite3` (`db.backup(destinationPath)`).

### Rationale
- O método `db.backup()` aciona a API C do SQLite (`sqlite3_backup_*`), que efetua um checkpoint seguro e realiza a cópia consistente página por página sem travar leitores ou escritores em modo WAL.
- Não bloqueia a thread de execução do Node.js nem causa lentidão perceptível para requisições concorrentes de usuários cadastrando horas (cumpre SC-002 e Princípio IV da Constituição).
- O arquivo gerado é um banco SQLite válido e independente, pronto para ser compactado e armazenado.

### Alternativas Consideradas
- **Cópia direta de arquivos (`fs.copyFileSync`)**: Rejeitada porque em WAL mode o arquivo `.db` principal pode não conter transações recentes ainda pendentes no `.db-wal`, ou pode ser copiado no meio de um flush de página gerando corrupção.
- **Exportação SQL via script (`.dump`)**: Rejeitada por gerar overhead elevado de CPU e memória em bancos maiores no Raspberry Pi, além de exigir reexecução de DDL/DML na restauração.
- **Comando externo via shell (`child_process.exec('sqlite3 ...')`)**: Rejeitada para evitar dependência de binários externos instalados no container, mantendo o container Docker minimalista (Princípio V).

---

## 2. Compactação de Arquivos e Formato do Artefato de Exportação

### Contexto
Cartões de memória flash e volumes externos em Raspberry Pi exigem minimização de I/O de escrita e economia de espaço em disco. O backup deve ser autocontido, seguro e de baixo consumo de recursos (Princípio III e Hardware Constraints).

### Decisão
Compactar o snapshot SQLite utilizando streaming com `node:zlib` (`createGzip()`), gerando um arquivo `.sqlite.gz` (ou `.sql.gz`), acompanhado de um arquivo de manifesto metadata JSON ou cabeçalho padronizado contendo versão da aplicação, timestamp ISO, schema version e hash SHA-256.

### Rationale
- `node:zlib` é módulo nativo da biblioteca padrão do Node.js, não adicionando dependências externas (`node_modules`) pesadas.
- O uso de streams do Node.js (`fs.createReadStream().pipe(zlib.createGzip()).pipe(fs.createWriteStream())`) garante consumo fixo e irrisório de memória RAM (< 15MB durante o processo), atendendo com folga o limite de 150MB/200MB de RAM do container no Raspberry Pi.
- Reduz em até 70-85% o tamanho final do arquivo gravado no armazenamento externo.

### Alternativas Consideradas
- **Formatos `.zip` com bibliotecas terceiras (ex: `archiver`)**: Rejeitada para evitar introduzir dependências adicionais desnecessárias quando o `node:zlib` nativo atende com máxima performance.
- **JSON dump completo de todas as tabelas**: Rejeitada porque a reconstituição de tipos primitivos (datas, chaves estrangeiras, índices) é menos performática e mais sujeita a erros do que o snapshot binário nativo com integridade verificada.

---

## 3. Agendador de Rotinas no Servidor (In-Process Scheduler)

### Contexto
O requisito FR-001 exige rotinas automáticas programáveis com frequências diária, semanal e mensal em horários configuráveis. O Princípio III da Constituição proíbe arquiteturas com microserviços, filas externas (RabbitMQ, Redis, BullMQ) ou daemons corporativos pesados.

### Decisão
Implementar um serviço de agendamento embutido no processo Node.js (`server/src/services/backup-scheduler.ts`) executando uma checagem periódica a cada 60 segundos via `setInterval`.

### Rationale
- O scheduler consulta a configuração ativa de rotina persistida no banco SQLite (`backup_schedules`).
- Avalia se o horário atual coincide com a janela agendada (baseado em hora/minuto e dia da semana ou dia do mês) e se a rotina já foi executada na janela atual (comparando `last_run_at`).
- Controle de concorrência com flag atômica em memória (`isBackupRunning`) impede disparos simultâneos (atende FR-011).
- Sobrecarga de CPU em repouso é praticamente zero (uma verificação simples por minuto).
- Não adiciona processos ou daemons externos ao container Docker.

### Alternativas Consideradas
- **Cron do sistema operacional (cron no Linux host / container)**: Rejeitada pois criaria dependências do sistema operacional hospedeiro ou de processos paralelos no Alpine/container, complicando a portabilidade do container (Princípio V).
- **BullMQ / Redis**: Rejeitada formalmente pela Constituição (Princípio III - proibição de mensageria externa e foco em RAM < 200MB).
- **Pacotes npm pesados de agendamento**: Rejeitados em favor de um avaliador simples de horário (hora, minuto, dias da semana, dia do mês) baseado no objeto `Date` nativo do JavaScript.

---

## 4. Política de Retenção e Gerenciamento do Armazenamento Externo

### Contexto
Backups contínuos sem descarte de arquivos antigos causam esgotamento de disco (especialmente em storages montados ou cartões SD).

### Decisão
Implementar rotação baseada em contagem máxima (`max_retained_backups`, padrão configurável ex: 7, 14 ou 30 cópias).
- A purga é executada imediatamente **após** a confirmação de escrita bem-sucedida e validação de integridade do novo backup gerado (atende FR-007).
- A limpeza consulta os registros históricos de backup e valida os arquivos existentes na pasta de backup externa (`BACKUP_DIR`), removendo os arquivos excedentes mais antigos e marcando o status como `purged` no banco.

### Rationale
- Garantia de que pelo menos N backups válidos sempre estarão preservados.
- Elimina risco de exclusão prematura: o backup mais recente nunca é excluído, e backups antigos só são removidos se o novo estiver comprovadamente íntegro.

### Alternativas Consideradas
- **Retenção puramente por idade em dias**: Menos segura quando o servidor passa dias desligado, pois poderia expurgar todos os backups se passasse muito tempo sem ligar. A contagem mínima retida garante que sempre haverá cópias disponíveis.

---

## 5. Destino de Armazenamento Externo e Configuração Docker

### Contexto
Os arquivos de backup devem residir fora do contêiner da aplicação para sobreviver a destruições de containers e permitir envio a dispositivos externos (HD externo, pendrive, NAS ou bind mount).

### Decisão
Definir uma variável de ambiente `BACKUP_DIR` (padrão em produção `/backups`, e em desenvolvimento `./data/backups`).
- No `docker-compose.yml`, expor o volume / ponto de montagem nomeado `minhashoras-backups` mapeado para `/backups`, que pode ser facilmente alterado pelo usuário para um bind mount no host (ex: `/mnt/external-disk/backups:/backups`).
- A aplicação verifica se o diretório de destino existe e possui permissão de escrita antes de iniciar a gravação.

### Rationale
- Segue estritamente o Princípio V da Constituição (persistência em volumes declarados do Docker).
- Permite que o operador do homelab aponte a pasta `/backups` para um diretório montado em storage externo, NFS ou drive local via simples configuração de volume no Compose.

---

## 6. Verificação de Integridade e Auditoria

### Contexto
O backup precisa ser confiável e auditável para que o usuário saiba que os dados estão intactos (FR-008 e FR-009).

### Decisão
- Antes de consolidar a execução como sucesso, o arquivo SQLite intermediário é testado via `PRAGMA integrity_check` (ou `quick_check`).
- O hash SHA-256 do arquivo `.sqlite.gz` final é computado via streaming com `node:crypto`.
- O hash, o tamanho exato em bytes e a contagem de registros são persistidos na tabela `backup_runs`.
- O hash é exposto no endpoint de histórico e nos cabeçalhos de download para permitir validação do arquivo pelo usuário.

### Rationale
- Validação rápida e determinística.
- Transparência total para o usuário e proteção contra arquivos truncados por falhas de energia ou espaço esgotado.
