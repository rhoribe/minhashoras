# Contract: Password Change & Self-Service Deletion API

## 1. POST /api/v1/auth/change-password

Allows an authenticated user to update their own password, specifically used to clear the mandatory `must_change_password` flag.

### Security
- **Authentication**: Bearer token required in `Authorization` header.

### Request

```http
POST /api/v1/auth/change-password HTTP/1.1
Host: localhost:3000
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "new_password": "NewSecurePassword123!"
}
```

### Responses

#### 200 OK
```json
{
  "success": true,
  "message": "Senha atualizada com sucesso.",
  "user": {
    "id": "default_admin_id",
    "username": "admin",
    "display_name": "Administrador",
    "role": "admin",
    "must_change_password": false
  }
}
```

#### 400 Bad Request
```json
{
  "error": "A senha deve conter no mínimo 8 caracteres, incluindo letras e números."
}
```

---

## 2. DELETE /api/v1/auth/me

Allows any authenticated user to permanently delete their own account and all personal overtime/compensation records.

### Security
- **Authentication**: Bearer token required in `Authorization` header.

### Request

```http
DELETE /api/v1/auth/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer <user_token>
```

### Responses

#### 200 OK
```json
{
  "success": true,
  "message": "Sua conta e todos os seus registros foram excluídos permanentemente com sucesso."
}
```

#### 400 Bad Request (Sole Admin Protection)
```json
{
  "error": "O único administrador ativo do sistema não pode excluir a própria conta para evitar bloqueio definitivo do sistema."
}
```

#### 401 Unauthorized
```json
{
  "error": "Não autenticado."
}
```
