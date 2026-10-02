# Contract: Batch Synchronization API (`POST /api/v1/sync`)

**Feature Branch**: `004-fix-sync-and-status`
**Version**: `1.1.0`
**Endpoint**: `POST /api/v1/sync`
**Authentication**: Optional/Bearer session token (scoped to `req.userId` or header `x-user-id`)

## Request Specification

### Headers
```http
Content-Type: application/json
Authorization: Bearer <session-token> (ou x-user-id: <user-id>)
```

### JSON Schema (Request Body)
```json
{
  "type": "object",
  "properties": {
    "records": {
      "type": "array",
      "description": "Lista de registros de horas extras criados ou editados no cliente",
      "items": {
        "type": "object",
        "required": ["id", "record_date", "start_time", "end_time"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "user_id": { "type": "string" },
          "record_date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
          "start_time": { "type": "string", "pattern": "^\\d{2}:\\d{2}$" },
          "end_time": { "type": "string", "pattern": "^\\d{2}:\\d{2}$" },
          "break_duration_minutes": { "type": "integer", "minimum": 0 },
          "description": { "type": ["string", "null"] },
          "category": { "type": "string" },
          "client_updated_at": { "type": "string", "format": "date-time" }
        }
      }
    },
    "compensations": {
      "type": "array",
      "description": "Lista de agendamentos de compensação criados ou editados no cliente",
      "items": {
        "type": "object",
        "required": ["id", "planned_date", "scheduled_minutes"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "user_id": { "type": "string" },
          "planned_date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
          "scheduled_minutes": { "type": "integer", "minimum": 1 },
          "actual_minutes": { "type": ["integer", "null"] },
          "status": { "type": "string", "enum": ["Scheduled", "Completed", "Cancelled"] },
          "notes": { "type": ["string", "null"] },
          "client_updated_at": { "type": "string", "format": "date-time" }
        }
      }
    },
    "deleted_record_ids": {
      "type": "array",
      "description": "Lista de UUIDs de registros de horas extras excluídos pelo usuário no cliente",
      "items": { "type": "string", "format": "uuid" }
    },
    "deleted_compensation_ids": {
      "type": "array",
      "description": "Lista de UUIDs de compensações excluídas pelo usuário no cliente",
      "items": { "type": "string", "format": "uuid" }
    },
    "client_sync_timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

---

## Response Specification

### Status Code: `200 OK`
```json
{
  "type": "object",
  "required": [
    "applied_record_ids",
    "applied_compensation_ids",
    "applied_deleted_record_ids",
    "applied_deleted_compensation_ids",
    "conflicts",
    "balance",
    "server_timestamp"
  ],
  "properties": {
    "applied_record_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs dos registros de horas extras inseridos ou alterados com sucesso."
    },
    "applied_compensation_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs das compensações inseridas ou alteradas com sucesso."
    },
    "applied_deleted_record_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs dos registros de horas extras excluídos com sucesso no servidor."
    },
    "applied_deleted_compensation_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "IDs das compensações excluídas com sucesso no servidor."
    },
    "conflicts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "balance": {
      "type": "object",
      "description": "Saldo recalculado do banco de horas para o usuário."
    },
    "server_timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

---

## Comportamento Semântico no Servidor

1. **Atomicidade Transacional**: Todas as operações (inserções, atualizações e exclusões) são executadas dentro de uma única transação SQLite (`db.transaction`).
2. **Isolamento de Usuário**: Exclusões e atualizações afetam apenas registros cujo `user_id` corresponda ao usuário autenticado.
3. **Resolução de Conflitos (Edições)**:
   - Se o registro não existir no servidor, ele é criado.
   - Se já existir, a data `client_updated_at` recebida é comparada com a data `client_updated_at` existente no servidor. Se a versão recebida for igual ou mais recente, a atualização é aplicada e seu ID é retornado em `applied_record_ids`.
   - Se a versão no servidor for estritamente mais recente, a atualização é recusada, incluída na lista `conflicts` com `{ id, reason: 'server_version_newer' }`, e **NÃO** deve ser adicionada a `applied_record_ids`.
4. **Exclusões**:
   - Para cada ID em `deleted_record_ids`, executa a deleção física no SQLite (se existir). O ID é confirmado em `applied_deleted_record_ids`.
   - Idempotente: se o registro já tiver sido excluído anteriormente, o ID ainda é confirmado em `applied_deleted_record_ids` para permitir que o cliente limpe sua fila.
5. **Recálculo Imediato**: O saldo consolidado de horas extras (`recalculateBalance(userId)`) é calculado e retornado no mesmo payload de resposta.
