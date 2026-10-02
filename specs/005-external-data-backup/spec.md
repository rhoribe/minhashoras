# Feature Specification: Mecanismo de Backup Externo e Rotinas Programáveis de Exportação Automática

**Feature Branch**: `005-external-data-backup`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "crie um mecanismo de backup externo do dados com rotina programaveis de exportacao automatica"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agendamento e Execução Automática de Exportação/Backup (Priority: P1)

Como usuário ou administrador do sistema de banco de horas, quero configurar uma rotina programável de exportação automática (definindo frequência como diária, semanal ou mensal, e horário de execução), para que todos os registros de horas, compensações e configurações sejam salvos periodicamente em um destino externo sem necessidade de intervenção manual, prevenindo perda de dados em caso de sinistro ou falha de hardware.

**Why this priority**: A automação periódica do backup é o núcleo do pedido; ela garante a continuidade e a proteção contínua dos dados sem depender da lembrança ou ação manual do usuário.

**Independent Test**: Pode ser testado de forma independente configurando uma rotina automática com periodicidade e horário definidos, permitindo a execução programada (ou adiantando o gatilho) e confirmando que o arquivo de backup é criado com sucesso no destino externo especificado, contendo a base completa de dados.

**Acceptance Scenarios**:

1. **Given** o usuário configurou uma rotina com frequência diária às 02:00 e o recurso está ativo, **When** o relógio do sistema atinge o horário programado, **Then** o sistema gera a exportação completa de dados no destino externo configurado de forma não bloqueante e registra o evento como concluído com sucesso no histórico.
2. **Given** o destino externo configurado está inacessível ou com permissão negada no momento do disparo, **When** a rotina agendada é acionada, **Then** o sistema aborta a operação com segurança sem corromper os dados originais, registra a falha com motivo claro no histórico e mantém a aplicação funcionando normalmente.
3. **Given** uma rotina existente ativa, **When** o usuário altera a periodicidade, muda o horário ou desativa a rotina e salva as configurações, **Then** o sistema atualiza o agendamento imediatamente para que as próximas execuções sigam rigorosamente a nova regra.

---

### User Story 2 - Disparo Manual sob Demanda e Download Imediato de Backup (Priority: P2)

Como usuário do aplicativo, quero poder acionar manualmente a geração de um backup a qualquer momento e baixar ou exportar o arquivo resultante imediatamente, para que eu possa criar um ponto seguro de restauração antes de manutenções ou manter uma cópia de segurança em minha posse.

**Why this priority**: Oferece autonomia para criar snapshots instantâneos antes de grandes alterações, fechamentos contábeis mensais ou migrações, sem ter que aguardar o próximo ciclo programado.

**Independent Test**: Pode ser testado acessando o painel de gerenciamento de backup, clicando na ação de exportação manual e confirmando que o processo é executado com feedback visual claro, gerando o arquivo para download direto e gravação no repositório externo.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela de gerenciamento de backups, **When** ele clica na opção de gerar backup sob demanda, **Then** o sistema inicia a exportação, exibe o progresso em segundo plano e, ao término, notifica o usuário sobre o sucesso disponibilizando a opção de download imediato do arquivo.
2. **Given** um backup manual concluído com sucesso, **When** o usuário solicita o download do arquivo gerado, **Then** o arquivo estruturado e compactado é baixado no dispositivo com identificação clara contendo carimbo de data e hora.

---

### User Story 3 - Configuração de Destino Externo e Política de Retenção (Priority: P3)

Como administrador do sistema, quero configurar o caminho de armazenamento externo (volume externo montado ou caminho de rede) e definir uma política de retenção automática (quantidade máxima de backups a manter), para garantir que as cópias fiquem guardadas fora do contêiner da aplicação e que versões antigas sejam limpas automaticamente sem esgotar o espaço em disco do servidor.

**Why this priority**: Ambientes com armazenamento restrito (como servidores caseiros e single-board computers) podem sofrer colapso de disco se backups acumularem indefinidamente; a retenção e o destino externo garantem durabilidade e sustentabilidade operacional.

**Independent Test**: Pode ser testado configurando uma política de retenção para reter no máximo 3 backups, gerando 4 backups consecutivos e verificando que apenas os 3 arquivos mais recentes são mantidos no diretório externo, tendo o mais antigo sido removido com segurança.

**Acceptance Scenarios**:

1. **Given** um caminho de destino externo válido configurado, **When** qualquer rotina de backup (automática ou manual) é executada, **Then** o arquivo de dados é gravado e preservado diretamente nesse local externo.
2. **Given** o sistema possui uma política de retenção configurada para N cópias, **When** uma nova exportação é finalizada com êxito ultrapassando o limite N, **Then** o sistema elimina automaticamente a cópia mais antiga presente no destino externo, mantendo exatamente as N cópias mais recentes.
3. **Given** uma falha ao tentar remover um backup antigo por retenção, **When** a limpeza é tentada, **Then** o backup recém-criado é preservado intacto e um aviso sobre a falha de expurgo é registrado no histórico sem interromper o serviço.

---

### User Story 4 - Validação de Integridade e Histórico de Execuções (Priority: P4)

Como usuário interessado na confiabilidade dos meus registros de trabalho, quero visualizar um histórico completo das execuções de backup com indicação de data, horário, origem (automático/manual), tamanho e integridade da cópia gerada, para ter certeza de que meus backups não estão corrompidos e são viáveis para restauração.

**Why this priority**: Backups que falham silenciosamente criam uma falsa ilusão de segurança. O histórico transparente e o teste de integridade do arquivo gerado asseguram a validade dos dados guardados.

**Independent Test**: Pode ser testado visualizando a lista de backups recentes no painel, confirmando que cada entrada exibe data/hora de geração, tamanho em bytes/MB, método de disparo e validação de consistência do arquivo.

**Acceptance Scenarios**:

1. **Given** múltiplas execuções de backup realizadas ao longo do tempo, **When** o usuário abre a listagem de histórico, **Then** cada execução é apresentada com data, horário, status (sucesso, falha ou em andamento), modalidade e tamanho do arquivo gerado.
2. **Given** a geração de um arquivo de backup é finalizada, **When** o sistema conclui a escrita, **Then** ele calcula uma soma de verificação (hash de integridade) e valida que a estrutura do arquivo gerado é consistente antes de marcá-lo como disponível.

---

### Edge Cases

- **Esgotamento de espaço em disco no destino externo**: Se o armazenamento externo não possuir espaço suficiente para concluir a exportação, o sistema deve abortar a escrita, remover qualquer arquivo temporário incompleto, registrar o erro de espaço insuficiente no histórico e alertar o usuário sem afetar a integridade da base de dados ativa.
- **Concorrência entre gravação de horas e rotina de backup**: Se um usuário estiver cadastrando ou alterando horas extras no mesmo instante em que a rotina automática é disparada, o mecanismo de backup deve usar cópia consistente/não bloqueante (snapshot consistente), garantindo que as operações do usuário não sejam travadas nem resultem em backups com dados em estado intermediário/corrompido.
- **Reinicio ou desligamento do servidor durante o horário programado**: Se o servidor estiver temporariamente desligado durante o horário de disparo da rotina automática, o agendador ao reiniciar deve verificar a última data de execução bem-sucedida e, de acordo com a política de tolerância, agendar a próxima janela ou disparar uma execução de compensação sem entrar em loops contínuos de disparo.
- **Tentativa de backup manual enquanto outro backup está em andamento**: Se uma rotina automática estiver em execução e o usuário solicitar um backup manual (ou vice-versa), o sistema deve informar que um processo de exportação já se encontra em progresso, evitando concorrência excessiva de disco e CPU.
- **Sincronizações pendentes em clientes offline**: Se clientes móveis estiverem com registros pendentes na fila local do dispositivo (offline), o backup do servidor exportará com exatidão o estado centralizado no servidor; a interface deve orientar com clareza que dados mantidos exclusivamente em cache de navegador ainda não sincronizados não constam no backup externo do servidor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar uma interface e endpoints para configuração de rotinas programadas de backup automático, permitindo selecionar frequência (diária, semanal ou mensal) e horário específico de disparo.
- **FR-002**: O sistema DEVE permitir ativar ou desativar a execução automática das rotinas programadas a qualquer momento.
- **FR-003**: O sistema DEVE possibilitar a execução de exportação manual sob demanda a qualquer instante a partir do painel de administração/configurações.
- **FR-004**: O sistema DEVE exportar a totalidade dos dados operacionais da aplicação (registros de horas extras, compensações, configurações de usuários e parâmetros do sistema) em arquivo autocontido e compactado.
- **FR-005**: O sistema DEVE suportar a configuração de um caminho de destino externo ao contêiner (como volume persistente dedicado no host ou ponto de montagem externo) para gravação automática e segura dos arquivos gerados.
- **FR-006**: O sistema DEVE fornecer funcionalidade de download direto dos arquivos de backup gerados através da interface web para usuários com permissão administrativa.
- **FR-007**: O sistema DEVE aplicar uma política de retenção automática configurável (número máximo de cópias armazenadas), expurgando com segurança a versão mais antiga do destino externo somente após o sucesso da nova exportação gerada.
- **FR-008**: O sistema DEVE validar a integridade estrutural e calcular uma soma de verificação (hash de integridade) de cada arquivo exportado imediatamente após a sua criação.
- **FR-009**: O sistema DEVE manter e exibir um histórico detalhado das últimas execuções de backup contendo carimbo de data/hora, tipo de execução (automática ou manual), status (sucesso, falha ou em andamento), tamanho do arquivo gerado e mensagem de detalhe em caso de erro.
- **FR-010**: O sistema DEVE executar as rotinas de backup sem bloquear requisições de usuários nem degradar o tempo de resposta das operações regulares de registro e consulta de horas.
- **FR-011**: O sistema DEVE impedir execuções simultâneas de backup, retornando status informativo quando já houver uma rotina ou exportação manual em processamento.

### Key Entities *(include if feature involves data)*

- **Rotina de Backup (Backup Schedule)**: Configuração das regras de automação. Atributos: identificador, frequência (diária, semanal, mensal), horário agendado, indicador de ativação (ativo/inativo), limite de retenção (quantidade máxima de arquivos), carimbo de data/hora da última execução e carimbo da próxima execução programada.
- **Registro de Execução de Backup (Backup Run / Artifact)**: Registro individual de cada processo de exportação e arquivo gerado. Atributos: identificador, modalidade de disparo (automático ou manual), carimbo de início e término, status (sucesso, falha, em andamento), nome do arquivo, tamanho em bytes, soma de verificação de integridade, caminho no destino externo e mensagem de erro/diagnóstico caso tenha falhado.
- **Configuração de Destino de Backup (Backup Storage Settings)**: Definições de localização e regras de armazenamento. Atributos: caminho do diretório ou volume externo, prefixo de nomenclatura dos arquivos e formato de empacotamento/compressão.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das rotinas automáticas ativas são disparadas dentro de uma margem de no máximo 60 segundos do horário programado quando o servidor está em operação normal.
- **SC-002**: A execução do backup não causa bloqueio nem eleva a latência média de requisições de registro de horas em mais de 500 milissegundos durante o processo de exportação.
- **SC-003**: O usuário consegue iniciar uma exportação manual sob demanda com no máximo 2 cliques a partir da tela de configurações de backup.
- **SC-004**: 100% dos arquivos de backup marcados como sucesso passam na verificação de integridade estrutural e contêm a totalidade dos dados registrados até o momento do início da exportação.
- **SC-005**: A política de retenção mantém rigorosamente a quantidade máxima de arquivos de backup definida nas configurações, prevenindo o crescimento indefinido de arquivos no destino externo sem nunca remover o backup mais recente.
- **SC-006**: Usuários conseguem identificar a situação do último backup (data/hora, sucesso ou falha) em menos de 5 segundos ao abrir a tela de gerenciamento de backup.

## Assumptions

- O ambiente de implantação (Docker Compose / host) disponibiliza um volume persistente mapeado ou caminho de diretório externo dedicado com permissões de leitura e escrita para o armazenamento seguro dos arquivos exportados.
- O formato do arquivo exportado garante capacidade de preservação integral do esquema relacional de dados para suporte a restaurações futuras.
- O backup cobre os dados consolidados e persistidos na base central do servidor; dados offline armazenados exclusivamente em clientes móveis/navegadores que ainda não sincronizaram com o servidor devem ser sincronizados previamente para constarem na exportação.
- A rotina de backup respeita as diretrizes constitucionais do projeto de eficiência de recursos e baixo consumo de CPU/memória para compatibilidade com execução em single-board computers (Raspberry Pi), evitando picos que provoquem esgotamento de memória (OOM).
- Apenas usuários devidamente autorizados/administradores têm permissão para acessar a configuração de rotinas, histórico de backups e download dos arquivos gerados, protegendo a confidencialidade dos registros de horas.
