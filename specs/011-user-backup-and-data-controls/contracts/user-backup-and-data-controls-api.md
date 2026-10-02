# Contracts: User-Scoped Backups, Voluntary Password Change & Personal Data Controls API

## 1. GET /api/v1/user/export-backup

Generates and downloads a portable, structured JSON document containing all personal overtime records, compensations, and preferences for the authenticated user.

### Security
- **Authentication**: Bearer token required (`authenticate` hook).
- **Access**: Standard user or Admin.

### Request
```http
GET /api/v1/user/export-backup HTTP/1.1
Host: localhost:3000
Authorization: Bearer <user_token>
```

### Responses

#### 200 OK
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Disposition: attachment; filename="minhashoras-backup-joaosilva-2026-10-02.json"

{
  "metadata": {
    "format_version": "1.0",
    "app": "Minhas Horas",
    "exported_at": "2026-10-02T18:00:00.000Z"
  },
  "user": {
    "id": "u-1234",
    "username": "joaosilva",
    "email": "joao@example.com",
    "display_name": "João Silva",
    "role": "user",
    "created_at": "2026-09-01T10:00:00.000Z"
  },
  "preferences": {
    "theme_mode": "system",
    "daily_standard_work_minutes": 480,
    "max_positive_limit_minutes": 2400,
    "max_negative_limit_minutes": -600,
    "warning_threshold_percentage": 80
  },
  "balance_summary": {
    "total_positive_minutes": 180,
    "total_negative_minutes": 0,
    "net_balance_minutes": 180,
    "projected_balance_minutes": 180,
    "last_calculated_at": "2026-10-02T17:30:00.000Z"
  },
  "records": [
    {
      "id": "rec-1",
      "record_date": "2026-10-01",
      "start_time": "08:00",
      "end_time": "18:00",
      "break_duration_minutes": 60,
      "net_overtime_minutes": 60,
      "description": "Fechamento mensal",
      "category": "standard",
      "created_at": "2026-10-01T18:05:00.000Z",
      "updated_at": "2026-10-01T18:05:00.000Z"
    }
  ],
  "compensations": []
}
```

---

## 2. POST /api/v1/auth/change-password

Updates the authenticated user's password. Requires `current_password` when `must_change_password === 0`.

### Security
- **Authentication**: Bearer token required.

### Request
```http
POST /api/v1/auth/change-password HTTP/1.1
Host: localhost:3000
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```

### Responses

#### 200 OK
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso.",
  "user": {
    "id": "u-1234",
    "username": "joaosilva",
    "display_name": "João Silva",
    "role": "user",
    "must_change_password": false
  }
}
```

#### 400 Bad Request (Wrong Current Password)
```json
{
  "statusCode": 400,
  "error": "A senha atual informada está incorreta.",
  "message": "A senha atual informada está incorreta."
}
```

#### 400 Bad Request (Weak Password or Same as Old)
```json
{
  "statusCode": 400,
  "error": "A senha deve conter no mínimo 8 caracteres, incluindo letras e números.",
  "message": "A senha deve conter no mínimo 8 caracteres, incluindo letras e números."
}
```

---

## 3. POST /api/v1/user/reset-records

Deletes all overtime records and compensations for the authenticated user, resetting balance to zero.

### Security
- **Authentication**: Bearer token required.

### Request
```http
POST /api/v1/user/reset-records HTTP/1.1
Host: localhost:3000
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "confirmation": "ZERAR-MEUS-REGISTROS"
}
```

### Responses

#### 200 OK
```json
{
  "success": true,
  "message": "Todos os seus registros de horas extras e compensações foram zerados com sucesso.",
  "purgedRecordsCount": 15,
  "purgedCompensationsCount": 2,
  "resetAt": "2026-10-02T18:10:00.000Z"
}
```

#### 400 Bad Request (Missing or Invalid Confirmation)
```json
{
  "statusCode": 400,
  "error": "BadRequest",
  "message": "Confirmação inválida. Digite 'ZERAR-MEUS-REGISTROS' para autorizar a limpeza dos seus registros."
}
```

---

## 4. RBAC Protection on System-Wide Backups (/api/v1/backups/*)

All endpoints under `/api/v1/backups/*` require the administrator role (`requireAdmin`).

### Request by Standard User
```http
GET /api/v1/backups/status HTTP/1.1
Authorization: Bearer <standard_user_token>
```

### Response
#### 403 Forbidden
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Acesso restrito a administradores do sistema."
}
```
