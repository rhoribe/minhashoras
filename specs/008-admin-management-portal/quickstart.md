# Quickstart & Verification Guide: Administrator Role & Management Portal

This document outlines end-to-end scenarios to verify the Administrator Role, User Management, Access Auditing, and Usage Reports.

---

## Scenario 1: Initial Database Migration & Admin Verification

### Goal
Ensure existing users automatically receive the `admin` role and migration `004_admin_and_roles.ts` applies cleanly.

### Steps
1. Execute database migrations:
   ```bash
   npm run db:migrate # or run server start
   ```
2. Verify schema and existing user promotion:
   ```bash
   sqlite3 data/minhas_horas.db "PRAGMA table_info(users);"
   # Should include: role (TEXT) and is_active (INTEGER)
   sqlite3 data/minhas_horas.db "SELECT id, username, role, is_active FROM users;"
   # Existing users must show role = 'admin' and is_active = 1
   ```
3. Start the test suite to confirm zero regressions:
   ```bash
   npm test
   ```

---

## Scenario 2: RBAC Security Guard (403 Forbidden on Admin Routes)

### Goal
Ensure non-admin users cannot access administrative endpoints or UI routes.

### Steps
1. Create a regular user with `role = 'user'`:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"colaborador","email":"colab@teste.com","password":"UserPassword123!","display_name":"Colaborador"}'
   ```
2. Log in as `colaborador` and capture token:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"colaborador","password":"UserPassword123!"}' | jq -r '.token')
   ```
3. Attempt to call administrative endpoints:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/v1/admin/users \
     -H "Authorization: Bearer $TOKEN"
   ```
   **Expected Outcome**: Returns HTTP `403 Forbidden`.
4. In the web interface:
   - Navigate to `/admin` while logged in as `colaborador`.
   - **Expected Outcome**: Vue Router guard redirects to `/` with no access granted; sidebar has no "Administração" item.

---

## Scenario 3: Admin User Creation, Role Assignment & Password Reset

### Goal
Validate administrator's ability to manage accounts and credentials.

### Steps
1. Log in as an administrator to obtain `ADMIN_TOKEN`.
2. List users:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/admin/users \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
   ```
3. Create a new user account:
   ```bash
   NEW_USER=$(curl -s -X POST http://localhost:3000/api/v1/admin/users \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"username":"novousuario","email":"novo@empresa.com","display_name":"Novo Usuário","password":"TempPassword123!","role":"user"}')
   USER_ID=$(echo $NEW_USER | jq -r '.user.id')
   ```
4. Reset the user's password:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/admin/users/$USER_ID/reset-password \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"new_password":"ResetPassword456!"}'
   ```
5. Authenticate with the reset credential:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"novousuario","password":"ResetPassword456!"}' | jq .
   ```
   **Expected Outcome**: Authentication succeeds with HTTP 200.

---

## Scenario 4: Sole Administrator Lockout Protection

### Goal
Verify that the system blocks deletion, deactivation, or demotion of the only remaining administrator.

### Steps
1. Query active admins count. If only one exists:
2. Attempt to delete or demote the sole admin:
   ```bash
   curl -s -X PUT http://localhost:3000/api/v1/admin/users/$ADMIN_USER_ID \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role":"user"}'
   ```
   **Expected Outcome**: Returns HTTP `400 Bad Request` with message: `"Não é possível remover, desativar ou despromover o único administrador ativo do sistema."`

---

## Scenario 5: Access Auditing & Session Revocation

### Goal
Verify that logins are recorded in audit logs and active sessions can be revoked.

### Steps
1. View audit logs:
   ```bash
   curl -s -X GET "http://localhost:3000/api/v1/admin/access-logs?page=1&limit=10" \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
   ```
   **Expected Outcome**: Contains recent `login_success` events with client IP and user agent.
2. View active sessions:
   ```bash
   SESSIONS=$(curl -s -X GET http://localhost:3000/api/v1/admin/sessions \
     -H "Authorization: Bearer $ADMIN_TOKEN")
   TARGET_SESSION_ID=$(echo $SESSIONS | jq -r '.sessions[1].id')
   ```
3. Revoke session:
   ```bash
   curl -s -X DELETE http://localhost:3000/api/v1/admin/sessions/$TARGET_SESSION_ID \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
   **Expected Outcome**: Returns HTTP 200. Subsequent request with the revoked token returns `401 Unauthorized`.

---

## Scenario 6: System Usage Report & CSV Export

### Goal
Verify consolidated calculations and CSV download.

### Steps
1. Fetch usage report:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/admin/reports/usage \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
   ```
   **Expected Outcome**: Returns JSON with `summary` (total overtime, compensations, balance) and per-user list.
2. Download CSV export:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/admin/reports/usage/export \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -o relatorio_teste.csv
   head -n 10 relatorio_teste.csv
   ```
   **Expected Outcome**: CSV contains UTF-8 formatted headers, overall summary metrics, and per-user breakdown.
