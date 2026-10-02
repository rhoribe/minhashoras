# API Contract: Report Export (`/api/v1/reports/export`)

**Feature**: `012-report-consistency-and-backup-auth`

## Endpoint Definition

### Export Overtime Report
- **URL**: `/api/v1/reports/export`
- **Method**: `GET`
- **PreHandler**: `authenticate` (enforces valid Bearer session token)

### Request Headers
```http
Authorization: Bearer <session-token>
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | Yes | One of `csv`, `xlsx`, `pdf` |
| `start_date` | string (YYYY-MM-DD) | Yes | Start date of interval (inclusive) |
| `end_date` | string (YYYY-MM-DD) | Yes | End date of interval (inclusive) |

### Responses

#### 200 OK
Returns the report file generated strictly for the authenticated user (`req.userId`).
- **Headers (CSV)**:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="relatorio_horas_<start>_a_<end>.csv"`
- **Headers (Excel)**:
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="relatorio_horas_<start>_a_<end>.xlsx"`
- **Headers (PDF)**:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="relatorio_horas_<start>_a_<end>.pdf"`

#### 400 Bad Request
When format is missing or invalid, or start/end dates are absent.
```json
{
  "error": "BadRequest",
  "message": "Invalid or missing format. Expected \"csv\", \"xlsx\", or \"pdf\"."
}
```

#### 401 Unauthorized
When token is missing, invalid, or expired.
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token de autenticação não fornecido."
}
```
ou
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Sessão inválida ou expirada. Por favor, autentique-se novamente."
}
```
