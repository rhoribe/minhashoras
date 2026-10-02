# Quickstart & Validation Guide: Mecanismo de Backup Externo

**Feature**: `005-external-data-backup`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Pré-Requisitos

1. Node.js 20+ ou Docker & Docker Compose instalados.
2. Servidor com banco de dados SQLite migrado (`npm run db:migrate` ou subida do container).
3. Diretório de backup externo configurado:
   - Em desenvolvimento: `./data/backups` (criado automaticamente se inexistente).
   - Em produção Docker: volume montado em `/backups` conforme declarado no `docker-compose.yml`.

---

## 2. Configuração de Ambiente

Para testes manuais ou em ambiente de desenvolvimento local, configure a variável de ambiente opcional:

```bash
export BACKUP_DIR="./data/backups"
```

No `docker-compose.yml`, o serviço `app` expõe o volume persistente:

```yaml
volumes:
  - minhashoras-data:/data
  - minhashoras-backups:/backups
```

---

## 3. Cenários de Validação Ponta a Ponta

### Cenário 1: Disparo Manual de Backup sob Demanda e Download

**Objetivo**: Provar que o usuário consegue gerar um backup manual com dados consistentes e efetuar o download imediato do arquivo compactado.

1. **Disparar o backup via API**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/backups/export \
     -H "Content-Type: application/json"
   ```
   **Resultado Esperado**: Código HTTP `202 Accepted` ou `200 OK` contendo JSON com `status: "completed"`, `id`, `fileName` (ex: `minhashoras-backup-*.sqlite.gz`), `fileSizeBytes` e `checksumSha256`.

2. **Verificar a existência e integridade física do arquivo**:
   ```bash
   ls -lh ./data/backups/
   ```
   **Resultado Esperado**: O arquivo `.sqlite.gz` gerado está presente e seu tamanho é coerente com a base compactada.

3. **Testar download do arquivo via endpoint**:
   ```bash
   BACKUP_ID="<ID_RETORNADO_NO_PASSO_1>"
   curl -OJ http://localhost:3000/api/v1/backups/$BACKUP_ID/download
   ```
   **Resultado Esperado**: Arquivo baixado com cabeçalho `Content-Type: application/gzip` e checksum correspondente.

4. **Verificar descompactação e leitura do banco exportado**:
   ```bash
   gzip -dc minhashoras-backup-*.sqlite.gz > /tmp/test-restore.db
   sqlite3 /tmp/test-restore.db "PRAGMA integrity_check;"
   sqlite3 /tmp/test-restore.db "SELECT count(*) FROM time_records;"
   ```
   **Resultado Esperado**: Retorna `ok` e a contagem exata de registros do banco em produção.

---

### Cenário 2: Configuração da Rotina Programada de Backup

**Objetivo**: Provar que a configuração da rotina automática pode ser ajustada e persistida corretamente.

1. **Consultar agendamento padrão**:
   ```bash
   curl -X GET http://localhost:3000/api/v1/backups/schedule
   ```
   **Resultado Esperado**: Objeto JSON com `frequency: "daily"`, `timeOfDay: "02:00"`, `retentionCount: 7`.

2. **Atualizar a rotina para semanal com retenção de 5 cópias**:
   ```bash
   curl -X PUT http://localhost:3000/api/v1/backups/schedule \
     -H "Content-Type: application/json" \
     -d '{
       "enabled": true,
       "frequency": "weekly",
       "timeOfDay": "03:30",
       "dayOfWeek": 0,
       "retentionCount": 5
     }'
   ```
   **Resultado Esperado**: Código HTTP `200 OK` retornando a configuração atualizada e calculando `nextRunAt` correspondente.

---

### Cenário 3: Validação da Política de Retenção Automática

**Objetivo**: Provar que, ao atingir o limite configurado de retenção (ex: 3 cópias), backups mais antigos são excluídos com segurança, mantendo apenas as cópias mais recentes.

1. Configurar retenção para 3 cópias:
   ```bash
   curl -X PUT http://localhost:3000/api/v1/backups/schedule \
     -H "Content-Type: application/json" \
     -d '{"retentionCount": 3}'
   ```
2. Disparar 4 backups consecutivos manuais sob demanda:
   ```bash
   for i in {1..4}; do
     curl -X POST http://localhost:3000/api/v1/backups/export
     sleep 2
   done
   ```
3. Consultar o diretório de arquivos e histórico:
   ```bash
   ls -1 ./data/backups/ | wc -l
   curl -X GET http://localhost:3000/api/v1/backups/history
   ```
   **Resultado Esperado**: Exatamente 3 arquivos físicos permanecem no diretório. No histórico da API, o primeiro backup gerado possui status `"purged"`, e os 3 mais recentes possuem status `"completed"`.

---

### Cenário 4: Validação pela Interface do Usuário (PWA)

1. Acessar a aplicação no navegador ou dispositivo móvel: `http://localhost:3000/#/settings`.
2. Rolar até a seção **Backup & Exportação de Dados**.
3. Clicar no botão **"Fazer Backup Agora"**.
   - **Resultado Esperado**: Exibe indicador de carregamento ("Gerando backup consistente..."), seguido por alerta de sucesso com opção de download.
4. Alterar o horário ou ativar o backup automático na interface e clicar em **"Salvar Rotina"**.
   - **Resultado Esperado**: Mensagem de confirmação e exibição do próximo horário de disparo.
5. Inspecionar a tabela/lista de histórico de backups recentes:
   - **Resultado Esperado**: Apresenta data/hora, tamanho, badge de sucesso (verde) e botão de download para cada execução válida.
