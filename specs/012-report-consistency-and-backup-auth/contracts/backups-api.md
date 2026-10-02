# API Contract: System Backups API (`/api/v1/backups/*`)

**Feature**: `012-report-consistency-and-backup-auth`

## Security Requirement
All endpoints under `/api/v1/backups/*` enforce `requireAdmin` preHandler.
Every client request must provide:
```http
Authorization: Bearer <admin-session-token>
```

---

## 1. On-Demand Manual Backup

- **URL**: `/api/v1/backups/export`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <admin-session-token>`
  - `Content-Type: application/json`
- **Body**: `{}`

### Responses

#### 200 OK
```json
{
  "id": "c1f7b889-4a92-4f6c-8438-fb1c8be4fa9a",
  "scheduleId": null,
  "triggerType": "manual",
  "status": "completed",
  "fileName": "minhashoras-manual-2026-10-02T20-00-00-000Z.sqlite.gz",
  "fileSizeBytes": 45120,
  "checksumSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "recordsCount": 15,
  "errorMessage": null,
  "startedAt": "2026-10-02T20:00:00.000Z",
  "completedAt": "2026-10-02T20:00:01.000Z"
}
```

#### 401 Unauthorized
When unauthenticated or session has expired.
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token de autenticação não fornecido."
}
```

#### 403 Forbidden
When user is authenticated but not an admin.
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Acesso negado. Recurso restrito a administradores."
}
```

#### 409 Conflict
When a backup is already executing.
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Um processo de backup já está em andamento. Aguarde a finalização."
}
```

---

## 2. Backup Schedule, Status & History

- `GET /api/v1/backups/schedule`
- `PUT /api/v1/backups/schedule`
- `GET /api/v1/backups/status`
- `GET /api/v1/backups/history?limit=20&offset=0`
- `GET /api/v1/backups/:id/download`
- `POST /api/v1/backups/:id/restore`

All require `Authorization: Bearer <admin-session-token>` and return 401/403 when authorization credentials are not provided or lack administrative rights.
