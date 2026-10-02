# API Contract: Administrator Management Endpoints

All endpoints below require authentication with the `admin` role via `Authorization: Bearer <token>`.
Any request by an unauthenticated user returns `401 Unauthorized`.
Any request by a non-admin authenticated user (`role !== 'admin'`) returns `403 Forbidden`.

---

## 1. User Management

### `GET /api/v1/admin/users`
Retrieve list of all users in the system.

**Response** `200 OK`:
```json
{
  "users": [
    {
      "id": "c6213791-5369-4366-88c9-2708fb5e0bc7",
      "username": "admin",
      "email": "admin@minhashoras.local",
      "display_name": "Administrador Principal",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-10-01T22:00:00.000Z",
      "updated_at": "2026-10-02T10:00:00.000Z",
      "active_sessions_count": 1
    }
  ]
}
```

---

### `POST /api/v1/admin/users`
Create a new user account directly.

**Request Body**:
```json
{
  "username": "joaosilva",
  "email": "joao@empresa.com",
  "display_name": "João Silva",
  "password": "TemporaryPassword123!",
  "role": "user"
}
```

**Response** `201 Created`:
```json
{
  "user": {
    "id": "4a7e9301-4be3-4e89-b57d-41126ca1f43a",
    "username": "joaosilva",
    "email": "joao@empresa.com",
    "display_name": "João Silva",
    "role": "user",
    "is_active": true,
    "created_at": "2026-10-02T12:00:00.000Z",
    "updated_at": "2026-10-02T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation failure (empty field, invalid email, weak password).
- `409 Conflict`: Username or email already registered.

---

### `PUT /api/v1/admin/users/:id`
Update an existing user's profile, role, or active status.

**Request Body**:
```json
{
  "display_name": "João S. Silva",
  "email": "joao.silva@empresa.com",
  "role": "admin",
  "is_active": true
}
```

**Response** `200 OK`:
```json
{
  "user": {
    "id": "4a7e9301-4be3-4e89-b57d-41126ca1f43a",
    "username": "joaosilva",
    "email": "joao.silva@empresa.com",
    "display_name": "João S. Silva",
    "role": "admin",
    "is_active": true,
    "updated_at": "2026-10-02T12:05:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Attempting to demote or deactivate the sole remaining active admin.
- `404 Not Found`: User does not exist.

---

### `POST /api/v1/admin/users/:id/reset-password`
Reset a user's password directly as an administrator.

**Request Body**:
```json
{
  "new_password": "NewSecretPassword123!"
}
```

**Response** `200 OK`:
```json
{
  "message": "Senha do usuário redefinida com sucesso."
}
```

**Error Responses**:
- `400 Bad Request`: Password does not meet security requirements.
- `404 Not Found`: User does not exist.

---

### `DELETE /api/v1/admin/users/:id`
Permanently delete a user account and associated personal entries.

**Response** `200 OK`:
```json
{
  "message": "Usuário removido com sucesso."
}
```

**Error Responses**:
- `400 Bad Request`: Attempting to delete the sole active admin account.
- `404 Not Found`: User does not exist.

---

## 2. Access Auditing & Active Sessions

### `GET /api/v1/admin/access-logs`
Retrieve paginated audit logs with optional search filtering.

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 25, max: 100)
- `search` (string, optional: filter by username or email)
- `event_type` (string, optional: e.g. `'login_success'`, `'password_reset'`)
- `start_date` (ISO string, optional)
- `end_date` (ISO string, optional)

**Response** `200 OK`:
```json
{
  "logs": [
    {
      "id": "e0b5b290-7cb5-48b4-9351-4fa3e46c7ad2",
      "user_id": "c6213791-5369-4366-88c9-2708fb5e0bc7",
      "username": "admin",
      "display_name": "Administrador Principal",
      "event_type": "login_success",
      "ip_address": "192.168.1.50",
      "user_agent": "Mozilla/5.0 (Linux; Android 14; Mobile)",
      "details": null,
      "created_at": "2026-10-02T11:45:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "total_pages": 6
  }
}
```

---

### `GET /api/v1/admin/sessions`
Retrieve all currently active sessions across all users.

**Response** `200 OK`:
```json
{
  "sessions": [
    {
      "id": "71b05fc6-4078-433a-8656-7ee6ef811568",
      "user_id": "c6213791-5369-4366-88c9-2708fb5e0bc7",
      "username": "admin",
      "display_name": "Administrador Principal",
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0 Chrome/128.0",
      "created_at": "2026-10-02T10:00:00.000Z",
      "last_used_at": "2026-10-02T12:00:00.000Z",
      "expires_at": "2026-11-01T10:00:00.000Z",
      "is_current_session": true
    }
  ]
}
```

---

### `DELETE /api/v1/admin/sessions/:id`
Revoke / terminate a specific active session.

**Response** `200 OK`:
```json
{
  "message": "Sessão revogada com sucesso."
}
```

**Error Responses**:
- `404 Not Found`: Session does not exist.

---

## 3. System-Wide Usage Reports & Analytics

### `GET /api/v1/admin/reports/usage`
Retrieve consolidated usage statistics and per-user breakdown.

**Query Parameters**:
- `start_date` (string, optional: YYYY-MM-DD)
- `end_date` (string, optional: YYYY-MM-DD)

**Response** `200 OK`:
```json
{
  "summary": {
    "total_users": 12,
    "active_users": 10,
    "total_overtime_minutes": 7240,
    "total_compensation_minutes": 2100,
    "net_balance_minutes": 5140,
    "total_entries_count": 86
  },
  "users": [
    {
      "user_id": "c6213791-5369-4366-88c9-2708fb5e0bc7",
      "username": "admin",
      "display_name": "Administrador",
      "role": "admin",
      "is_active": true,
      "overtime_minutes": 1440,
      "compensation_minutes": 480,
      "net_balance_minutes": 960,
      "entries_count": 12,
      "last_entry_date": "2026-10-01"
    }
  ]
}
```

---

### `GET /api/v1/admin/reports/usage/export`
Export system usage report as a CSV file.

**Query Parameters**:
- `start_date` (string, optional: YYYY-MM-DD)
- `end_date` (string, optional: YYYY-MM-DD)

**Response** `200 OK`:
- `Content-Type`: `text/csv; charset=utf-8`
- `Content-Disposition`: `attachment; filename="relatorio-uso-minhas-horas-2026-10-02.csv"`
- Body: RFC 4180 CSV with UTF-8 BOM, including summary header and per-user line items.
