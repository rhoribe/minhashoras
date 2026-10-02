# Research & Architectural Decisions: User-Scoped Backups & Data Controls

**Feature**: `011-user-backup-and-data-controls` | **Date**: 2026-10-02

## 1. Personal Backup vs. System-Wide Backup Architecture

### Context
Minhas Horas previously exposed full SQLite database backups (`/api/v1/backups/*`) directly in `SettingsView.vue`. In a multi-user environment, raw SQLite file exports contain all users' records, sessions, and hashes, which violates data privacy if accessible to standard non-admin users. Standard users need an export mechanism strictly limited to their own personal data.

### Decision
- **System-Wide Backup RBAC**: Protect all existing `/api/v1/backups/*` routes (`/export`, `/schedule`, `/history`, `/download/:id`, `/restore/:id`) with the `requireAdmin` preHandler hook. Return `403 Forbidden` if a non-admin user attempts access.
- **Frontend Segregation**: In `SettingsView.vue`, wrap the entire "Backup & Exportação de Dados" section and restore modals in `v-if="authState.isAdmin.value"`. Standard users will not see global backup controls or history.
- **Personal Data Backup (JSON Export)**: Provide a dedicated endpoint `GET /api/v1/user/export-backup` accessible to any authenticated user. It queries only records matching `user_id`, formats them into an ISO-timestamped portable JSON document (`minhashoras-backup-<username>-<YYYY-MM-DD>.json`), and returns it as a direct download.

### Alternatives Considered
- *Separate SQLite Database per User*: Would require multi-tenancy connection pooling, separate file locks, and complex migrations. Rejected for unnecessary architectural complexity on Raspberry Pi.
- *CSV-only Export*: CSV lacks nested structural schemas for preferences and limits. JSON preserves data types, structures, and metadata cleanly.

---

## 2. Voluntary Password Change Authentication Pattern

### Context
Feature 010 introduced `POST /api/v1/auth/change-password` for mandatory first-access password changes, which accepted only `{ new_password }`. For voluntary changes while authenticated in settings, security best practices demand verification of the `current_password` to prevent unauthorized changes if an unattended session is left open.

### Decision
- Update `POST /api/v1/auth/change-password` and `AuthService.changePassword`:
  - If the user has `must_change_password === 1`, `current_password` is optional (initial setup flow).
  - If the user has `must_change_password === 0`, `current_password` is **mandatory**.
  - Validate `current_password` against stored hash using `AuthService.verifyPassword`. If invalid, return `400 Bad Request` ("A senha atual está incorreta.").
  - Validate `new_password` complexity (min 8 characters, at least 1 letter and 1 number).
  - Enforce that `new_password !== current_password`.
- In `client/src/views/SettingsView.vue`:
  - Add an "Alterar Senha" button in the "Sua Conta" card.
  - Implement a modal dialog with `current_password`, `new_password`, and `confirm_password`, real-time validation badges, and touch targets $\ge 44 \times 44\text{ px}$.

### Alternatives Considered
- *Separate endpoint `/auth/update-password`*: Kept single endpoint `/auth/change-password` with contextual validation of `current_password` to maintain a unified, cohesive auth API.

---

## 3. Personal Records Reset (*Zerar Registros Pessoais*) vs. Account Deletion

### Context
Users occasionally wish to start over (e.g., beginning a new employment contract, clearing a testing period, or resetting accrued balances) without deleting their user account, display name, username, or login credentials.

### Decision
- **Endpoint**: `POST /api/v1/user/reset-records`:
  - Protected by `authenticate` hook.
  - Requires payload confirmation: `{ confirmation: "ZERAR-MEUS-REGISTROS" }` to prevent accidental execution.
  - Executes an atomic SQLite transaction:
    1. `DELETE FROM overtime_records WHERE user_id = ?`
    2. `DELETE FROM compensation_schedules WHERE user_id = ?`
    3. `UPDATE time_bank_balance SET total_positive_minutes = 0, total_negative_minutes = 0, net_balance_minutes = 0, projected_balance_minutes = 0, last_calculated_at = ? WHERE user_id = ?`
    4. Inserts audit log `USER_RECORDS_RESET`.
- **Client Synchronization**:
  - Upon receiving `200 OK`, client immediately clears local IndexedDB tables for that user:
    - Clears `overtimeRecords` and `compensations` for `user_id`.
  - Recalculates in-memory balance to 0 and emits refresh event.
- **UI Positioning**:
  - Danger zone in `SettingsView.vue` is structured into two distinct actions:
    1. **Zerar Apenas Meus Registros**: Resets records and balance, account remains active.
    2. **Excluir Minha Conta Definitivamente**: Completely destroys user account and all data.

### Alternatives Considered
- *Soft-deletion with archive flag*: Adds query overhead and complexity to balance calculators. The user explicitly requested to "zerar" (clear) records, and they have the option to generate a "Backup Pessoal" first if they want past history preserved.
