# Contract: System Factory Reset API

## Endpoint: POST /api/v1/admin/system/reset

Performs a full system reset, wiping operational database tables and optionally physical backup files.

### Security
- **Authentication**: Bearer token required in `Authorization` header.
- **Authorization**: Caller must have `role === 'admin'`. Non-admin accounts receive `403 Forbidden`.

### Request

```http
POST /api/v1/admin/system/reset HTTP/1.1
Host: localhost:3000
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "confirmation": "ZERAR",
  "deleteBackups": true
}
```

#### Request Schema
```json
{
  "type": "object",
  "properties": {
    "confirmation": {
      "type": "string",
      "description": "Required confirmation phrase. Must match 'ZERAR' (case-insensitive)."
    },
    "deleteBackups": {
      "type": "boolean",
      "default": true,
      "description": "If true, also removes all physical backup archive files from disk."
    }
  },
  "required": ["confirmation"]
}
```

### Responses

#### 200 OK - Reset Successful
```json
{
  "success": true,
  "message": "Base de dados e dados do sistema restaurados com sucesso.",
  "wipedRecordsCount": 42,
  "wipedBackupsCount": 5,
  "epoch": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "resetAt": "2026-10-02T15:30:00.000Z"
}
```

#### 400 Bad Request - Invalid Confirmation
```json
{
  "error": "Palavra-chave de confirmação inválida. Digite exatamente 'ZERAR' para prosseguir."
}
```

#### 401 Unauthorized - Missing / Invalid Token
```json
{
  "error": "Não autenticado."
}
```

#### 403 Forbidden - Non-Admin User
```json
{
  "error": "Acesso negado. Apenas administradores podem executar a restauração de fábrica."
}
```
