# Quickstart: Default Admin Bootstrap & Self-Service Account Deletion Validation

## Scenario 1: Initial Login with admin / admin123 & Forced Password Change

1. Login with seeded credentials:
   ```bash
   RES=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"admin","password":"admin123"}')
   TOKEN=$(echo $RES | jq -r '.token')
   MUST_CHANGE=$(echo $RES | jq -r '.user.must_change_password')
   ```
2. Verify `MUST_CHANGE` is `true`.
3. Attempt to change password via `POST /api/v1/auth/change-password`:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/change-password \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"new_password":"AdminSecurePass456!"}'
   ```
4. Verify response has `must_change_password: false`.
5. Login again with `admin` and `AdminSecurePass456!` to verify normal access.

---

## Scenario 2: Public Registration Privilege Boundary

1. Register user via `POST /api/v1/auth/register` with `{ "role": "admin" }` in payload:
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"standarduser","email":"std@example.com","password":"UserPassword123!","display_name":"Standard User","role":"admin"}'
   ```
2. Inspect returned user profile:
   Verify `role` is strictly `"user"` and NOT `"admin"`.
3. Try accessing `/api/v1/admin/users`:
   Verify `403 Forbidden` response.

---

## Scenario 3: User Self-Service Account & Data Deletion

1. As the standard user, create an overtime record.
2. Call `DELETE /api/v1/auth/me`:
   ```bash
   curl -s -X DELETE http://localhost:3000/api/v1/auth/me \
     -H "Authorization: Bearer $USER_TOKEN"
   ```
3. Verify status code is `200 OK`.
4. Verify user and all their overtime records are completely deleted from database.
5. Attempting to login with the deleted user returns `401 Unauthorized`.
