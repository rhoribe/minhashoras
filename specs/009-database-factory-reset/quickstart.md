# Quickstart: Database Factory Reset Validation

## Scenario 1: Reject Reset When Confirmation Phrase Does Not Match

1. Authenticate as an administrator:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password123"}' | jq -r '.token')
   ```
2. Send reset request with wrong keyword:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/admin/system/reset \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"confirmation":"NAO_ZERAR"}'
   ```
3. Verify status code is `400 Bad Request` and no data was deleted.

---

## Scenario 2: Successful Full System Reset

1. Create a sample overtime record and trigger a manual backup.
2. Send reset request with keyword `ZERAR` and `deleteBackups: true`:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/admin/system/reset \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"confirmation":"ZERAR","deleteBackups":true}'
   ```
3. Verify response status is `200 OK` with `success: true`.
4. Check that database tables are empty:
   - `SELECT COUNT(*) FROM overtime_records;` -> 0
   - `SELECT COUNT(*) FROM compensation_schedules;` -> 0
   - `SELECT COUNT(*) FROM backup_runs;` -> 0
5. Check that backup files in `backups/` directory have been removed.
6. Verify that the admin account can still log in and has 0 balance.

---

## Scenario 3: Non-Admin Rejection

1. Authenticate as a standard user with `role: 'user'`.
2. Attempt to call `POST /api/v1/admin/system/reset`.
3. Verify response status is `403 Forbidden`.
