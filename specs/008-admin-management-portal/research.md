# Research: Administrator Role & Management Portal

## Decision 1: Database Schema Evolution for RBAC & Audit Logging

### Context
Minhas Horas uses SQLite (`better-sqlite3`) with WAL mode. In migration `002_auth_and_user_preferences.ts`, the `users` and `user_sessions` tables were introduced without a `role` column or an `is_active` status flag. We need to introduce:
1. `role TEXT NOT NULL DEFAULT 'user'` on `users` (`'admin' | 'user'`).
2. `is_active INTEGER NOT NULL DEFAULT 1` on `users` (`1` = active, `0` = deactivated).
3. Automatic upgrade of existing registered accounts to `admin` so the instance owner is never locked out upon migration.
4. An `access_audit_logs` table for tracking logins, logouts, administrative user creation, role changes, password resets, and session revocations.

### Decision
Create migration `004_admin_and_roles.ts`:
- Alter table `users` to add `role TEXT NOT NULL DEFAULT 'user'` and `is_active INTEGER NOT NULL DEFAULT 1`.
- Execute an `UPDATE users SET role = 'admin'` for any existing users created prior to this migration, guaranteeing the primary user retains administrative ownership.
- Create `access_audit_logs`:
  ```sql
  CREATE TABLE IF NOT EXISTS access_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'login', 'logout', 'session_revoked', 'user_created', 'role_changed', 'password_reset', 'user_deactivated'
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON string or descriptive text
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_created_at ON access_audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_user_id ON access_audit_logs(user_id);
  ```

### Alternatives Considered
- *Separate permissions table (RBAC matrix)*: Rejected because the system only requires two simple tiers (`admin` and `user`). A granular permission matrix adds speculative complexity violating Constitution Principle III (Minimalist Architecture & YAGNI).
- *JSON column on users for roles/metadata*: Rejected because SQLite column additions with `TEXT DEFAULT 'user'` are simple, type-safe, and indexable.

---

## Decision 2: Admin Authorization Middleware & Lockout Prevention

### Context
Administrative operations (managing accounts, viewing logs, revoking sessions, viewing global reports) must only be accessible to users with the `admin` role. Non-admin users must receive `403 Forbidden`. Additionally, deleting, deactivating, or demoting the last remaining active admin must be prevented at the database/service layer to avoid catastrophic lockout.

### Decision
1. Implement a Fastify preHandler hook `requireAdmin`:
   ```typescript
   export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
     await authenticate(request, reply);
     if (reply.sent) return;

     if (!request.user || request.user.role !== 'admin' || request.user.is_active !== 1) {
       return reply.status(403).send({
         statusCode: 403,
         error: 'Forbidden',
         message: 'Acesso restrito a administradores do sistema.',
       });
     }
   }
   ```
2. Implement safety checks in `UserRepository` / `AdminService`:
   - When attempting to delete, demote, or deactivate a user with `role === 'admin'`:
   - Query count of active administrators: `SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`.
   - If `count <= 1`, abort the operation with an error code `SOLE_ADMIN_PROTECTED` / HTTP 400 (`"Não é possível remover, desativar ou despromover o único administrador ativo do sistema."`).
   - Prevent an administrator from deactivating their own account via the admin panel.

### Alternatives Considered
- *Role checks inside each individual route handler*: Rejected because centralizing in `requireAdmin` ensures consistent HTTP 403 responses and zero missed endpoints.

---

## Decision 3: System-Wide Usage Aggregation without N+1 Queries

### Context
The usage dashboard displays platform-wide overtime totals, compensations, net balance, and per-user breakdown for a given period. With up to 50 users and tens of thousands of entries, running per-user loops would trigger N+1 queries and high latency.

### Decision
Implement direct SQL aggregation queries in `AdminRepository`:
1. **Global Summary Query**:
   ```sql
   SELECT 
     COUNT(DISTINCT u.id) as total_users,
     COUNT(DISTINCT CASE WHEN u.is_active = 1 THEN u.id END) as active_users,
     COALESCE(SUM(r.duration_minutes), 0) as total_overtime_minutes,
     COALESCE(SUM(c.duration_minutes), 0) as total_compensation_minutes
   FROM users u
   LEFT JOIN overtime_records r ON r.user_id = u.id AND r.status != 'deleted' AND (:start IS NULL OR r.date >= :start) AND (:end IS NULL OR r.date <= :end)
   LEFT JOIN compensation_records c ON c.user_id = u.id AND c.status != 'deleted' AND (:start IS NULL OR c.date >= :start) AND (:end IS NULL OR c.date <= :end)
   ```
   *(Or separate single aggregation passes on `overtime_records` and `compensation_records` joined with users, ensuring zero duplicate cartesian joins).*
2. **Per-User Breakdown Query**:
   A single GROUP BY query joining `users` with `overtime_records` and `compensation_records`, aggregating minutes per user ID, returning results in a single database round-trip (< 20ms).
3. **CSV Export**: Stream or format aggregated user stats as RFC 4180 CSV with BOM for seamless opening in Excel/LibreOffice.

### Alternatives Considered
- *In-memory aggregation in Node.js*: Rejected because querying all records into Node.js heap wastes memory on low-resource single-board computers (violating Constitution Principle III).
- *Background cron worker generating daily materialized stats*: Rejected as unnecessary premature optimization for SQLite with indices on `(user_id, date, status)`.

---

## Decision 4: Mobile-First Responsive Admin Portal Architecture

### Context
Administrators may manage users or inspect logs on mobile phones or desktop workstations. Constitution Principle I mandates mobile touch targets $\ge 44 \times 44\text{ px}$, bottom navigation or ergonomic drawer access, and responsive layout.

### Decision
1. **Route Structure**:
   - `/admin`: Base Admin Portal route, protected by `meta: { requiresAdmin: true }` in `vue-router`.
   - Sub-tabs within `/admin`:
     - `Usuários` (User list, search, create user modal, edit user modal, reset password modal)
     - `Acessos & Sessões` (Audit log table/cards with pagination, active sessions list with revoke buttons)
     - `Relatórios` (System-wide metrics cards, per-user breakdown table, CSV export button)
2. **Navigation Integration**:
   - Desktop sidebar (`DesktopSidebar.vue`): Display `Administração` navigation item with a `ShieldAlert` or `ShieldCheck` icon, conditionally rendered when `authState.isAdmin.value === true`.
   - Mobile top header (`AppLayout.vue`): Add `Painel Admin` link inside the user profile popover for admin users.
3. **Mobile Ergonomics**:
   - On screens `< 768px`, data tables collapse into card-based layouts.
   - All action buttons (Edit, Reset Password, Revoke, Delete, Export) have `min-h-[44px]` and `min-w-[44px]`.
   - Pagination controls use prominent touch buttons for Next/Previous pages.
