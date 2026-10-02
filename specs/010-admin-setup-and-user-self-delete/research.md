# Research: Default Admin Bootstrap, Forced Password Change & Self-Service Data Deletion

## Technical Decisions

### Decision 1: Default Admin Bootstrap & Seed Strategy

- **Decision**: Introduce migration `006_admin_bootstrap_and_password_change.ts` that:
  1. Adds `must_change_password INTEGER NOT NULL DEFAULT 0` column to `users` table if absent.
  2. Seeds an `admin` account (`id = 'default_admin_id'`, `username = 'admin'`, `email = 'admin@local'`, `display_name = 'Administrador'`, `role = 'admin'`, `is_active = 1`, `must_change_password = 1`, `password_hash = AuthService.hashPassword('admin123')`) if no user with username `'admin'` exists.
  3. Reconciles existing users: users that are not the primary admin can have their roles verified or maintained.
- **Rationale**: Guarantees that any fresh install or upgraded environment has a known, immediate, and consistent default administrator (`admin` / `admin123`) without manual CLI steps.
- **Alternatives Considered**:
  - *Setup wizard screen on first run*: High frontend overhead; standard seed with immediate forced change is cleaner and matches common edge appliance workflows (e.g., Home Assistant, pfSense).

### Decision 2: Forced Password Change Flow & API Boundary

- **Decision**:
  - When `user.must_change_password === 1`:
    - The server returns `must_change_password: true` in login responses and session validations (`/auth/me`, `/auth/status`).
    - The client Vue router guard redirects any authenticated navigation to `/change-password` until the flag is cleared.
    - An endpoint `POST /api/v1/auth/change-password` accepts `{ new_password: string }`, validates strength, updates password, sets `must_change_password = 0`, logs audit event `PASSWORD_CHANGED`, and returns the updated user.
- **Rationale**: Completely isolates the account until the default credentials are replaced, preventing default password exposure.
- **Alternatives Considered**:
  - *Allowing user to dismiss prompt*: Insecure; default passwords like `admin123` would remain indefinitely.

### Decision 3: Strict Non-Admin Role Assignment on Public Registration

- **Decision**: In `server/src/routes/auth-routes.ts` (`POST /api/v1/auth/register`), explicitly hardcode `role: 'user'` when passing data to `authService.registerUser(...)`, strictly ignoring any `role` field submitted by the client payload.
- **Rationale**: Eliminates privilege escalation vulnerabilities through public self-registration.
- **Alternatives Considered**:
  - *Allowing role selection*: Dangerous; only existing administrators via the `/admin` portal should ever be permitted to assign administrative roles.

### Decision 4: Self-Service Account & Data Deletion Architecture

- **Decision**: Implement `DELETE /api/v1/auth/me` with `authenticate` preHandler.
  - Verify caller is authenticated.
  - Check Sole Admin Lockout: If caller is the only active administrator, reject with HTTP 400 Bad Request (`"O único administrador ativo do sistema não pode excluir a própria conta para evitar bloqueio definitivo do sistema."`).
  - Execute atomic SQLite transaction:
    - `DELETE FROM overtime_records WHERE user_id = ?`
    - `DELETE FROM compensation_schedules WHERE user_id = ?`
    - `DELETE FROM time_bank_balance WHERE user_id = ?`
    - `DELETE FROM time_bank_settings WHERE user_id = ?`
    - `DELETE FROM user_preferences WHERE user_id = ?`
    - `DELETE FROM user_sessions WHERE user_id = ?`
    - `DELETE FROM users WHERE id = ?`
  - Record audit log: `event_type = 'USER_SELF_DELETED'`
  - On client: invoke `clearAllLocalData()`, clear `localStorage`, log out, and redirect to `/login`.
- **Rationale**: Guarantees complete data eradication (LGPD/GDPR right to erasure) while preventing instance lockout.
- **Alternatives Considered**:
  - *Soft delete (marking is_active = 0)*: Does not fulfill the user's explicit requirement of "apagar os seus próprios dados, como conta e registros".
