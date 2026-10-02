# Quickstart: User-Scoped Backups & Data Controls Validation

This document outlines the end-to-end integration scenarios to validate the implementation of Feature 011.

---

## Scenario 1: Personal Data Backup vs. System Backup Boundary (US1)

1. **Register or login as a standard user**:
   ```bash
   USER_RES=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"carlosbackup","email":"carlos@test.internal","password":"CarlosPassword123!","display_name":"Carlos Teste"}')
   USER_TOKEN=$(echo $USER_RES | jq -r '.token')
   ```

2. **Create a sample overtime record**:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/records \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"id":"sample-carlos-rec-1","record_date":"2026-10-02","start_time":"08:00","end_time":"19:00","break_duration_minutes":60}'
   ```

3. **Download personal backup archive**:
   ```bash
   curl -i -X GET http://localhost:3000/api/v1/user/export-backup \
     -H "Authorization: Bearer $USER_TOKEN"
   ```
   - **Verification**: Status `200 OK`, `Content-Disposition` attachment header present, payload JSON contains Carlos's record and user profile without password hash.

4. **Attempt to access system-wide backup as standard user**:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/backups/status \
     -H "Authorization: Bearer $USER_TOKEN"
   ```
   - **Verification**: Returns `403 Forbidden` (`Acesso restrito a administradores do sistema`).

---

## Scenario 2: Voluntary Self-Service Password Change (US2)

1. **Attempt password change with invalid current password**:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/change-password \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"current_password":"WrongPassword123!","new_password":"BrandNewPassword456!"}'
   ```
   - **Verification**: Returns `400 Bad Request` with message `A senha atual informada está incorreta.`

2. **Execute password change with valid current password**:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/change-password \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"current_password":"CarlosPassword123!","new_password":"BrandNewPassword456!"}'
   ```
   - **Verification**: Returns `200 OK` with `success: true`.

3. **Verify subsequent login requires new password**:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"carlosbackup","password":"BrandNewPassword456!"}'
   ```
   - **Verification**: Returns `200 OK` with valid session token.

---

## Scenario 3: Personal Records Reset (US3)

1. **Invoke personal records reset with confirmation**:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/user/reset-records \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"confirmation":"ZERAR-MEUS-REGISTROS"}'
   ```
   - **Verification**: Returns `200 OK` with `success: true` and count of purged records.

2. **Verify user's records and balance are reset**:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/records \
     -H "Authorization: Bearer $USER_TOKEN"
   ```
   - **Verification**: Returns empty list `[]`.

3. **Verify user profile remains active**:
   ```bash
   curl -s -X GET http://localhost:3000/api/v1/auth/me \
     -H "Authorization: Bearer $USER_TOKEN"
   ```
   - **Verification**: Returns `200 OK` with Carlos's user profile.
