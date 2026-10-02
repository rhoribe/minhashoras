# Tasks: Administrator Role & Management Portal

**Branch**: `008-admin-management-portal` | **Spec**: [specs/008-admin-management-portal/spec.md](spec.md) | **Plan**: [specs/008-admin-management-portal/plan.md](plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and type definitions for administrator roles, active states, and audit logging.

- [X] T001 Create database migration `server/src/db/migrations/004_admin_and_roles.ts` adding `role` (`'admin' | 'user'`) and `is_active` (`1` | `0`) to `users`, upgrading existing users to `'admin'`, and creating `access_audit_logs` table with indices.
- [X] T002 [P] Create admin TypeScript interfaces and DTOs in `server/src/types/admin.ts` (`AdminUserDto`, `CreateUserRequest`, `UpdateUserRequest`, `ResetPasswordRequest`, `AccessAuditLogDto`, `AdminActiveSessionDto`, `SystemUsageMetricsDto`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core RBAC authorization hook, repository extensions, and base routing guards that MUST be complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement `requireAdmin` preHandler authorization hook in `server/src/routes/auth-routes.ts` checking `request.user.role === 'admin'` and `request.user.is_active === 1` returning 403 Forbidden on failure.
- [X] T004 Extend `UserRepository` in `server/src/repositories/user-repository.ts` with `role` and `is_active` in `UserEntity`, `listAllUsers()`, `updateUserRoleAndStatus()`, `countActiveAdmins()`, and sole admin protection query.
- [X] T005 [P] Extend `SessionRepository` in `server/src/repositories/session-repository.ts` with `listAllActiveSessions()` and `deleteSessionById(sessionId)`.
- [X] T006 [P] Implement `AdminRepository` in `server/src/repositories/admin-repository.ts` with `insertAuditLog()`, `getAuditLogs()`, and aggregated system usage queries.
- [X] T007 [P] Update `client/src/services/auth.ts` to include `role?: 'admin' | 'user'` in `User` interface and export reactive `isAdmin: computed(() => user.value?.role === 'admin')`.
- [X] T008 [P] Configure client route `/admin` with `meta: { requiresAdmin: true }` and navigation guard in `client/src/main.ts`.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Administrator Role & User Management (Priority: P1) 🎯 MVP

**Goal**: Administrators can view, create, edit, activate/deactivate, delete users, and reset passwords with sole-admin lockout protection; non-admins are strictly forbidden (403).

**Independent Test**: Log in as admin, list accounts, create a new user, edit user role, reset password, attempt to delete/demote sole admin (expecting 400 rejection), and attempt access as non-admin (expecting 403 Forbidden).

### Tests for User Story 1

- [X] T009 [P] [US1] Create unit and integration tests for RBAC, user management CRUD, password reset, and sole-admin guard in `server/tests/admin-rbac.test.ts`.

### Implementation for User Story 1

- [X] T010 [US1] Implement `AdminService` in `server/src/services/admin-service.ts` for user listing, user creation, user updates, password resets, and user deletion with sole-admin lockout prevention.
- [X] T011 [US1] Implement administrative user endpoints in `server/src/routes/admin-routes.ts` (`GET /api/v1/admin/users`, `POST /api/v1/admin/users`, `PUT /api/v1/admin/users/:id`, `POST /api/v1/admin/users/:id/reset-password`, `DELETE /api/v1/admin/users/:id`).
- [X] T012 [US1] Register `adminRoutes` plugin in `server/src/index.ts` under `/api/v1/admin`.
- [X] T013 [P] [US1] Implement admin client service in `client/src/services/admin.ts` with API methods (`fetchUsers`, `createUser`, `updateUser`, `resetPassword`, `deleteUser`).
- [X] T014 [US1] Create `client/src/components/admin/UserManagementTab.vue` providing user list/card view, create user modal, edit user modal, reset password modal, and touch targets $\ge 44 \times 44\text{ px}$.
- [X] T015 [US1] Create base Admin Portal view in `client/src/views/AdminView.vue` with tab navigation supporting `UserManagementTab`.
- [X] T016 [US1] Add "Administração" navigation entry in `client/src/components/layout/DesktopSidebar.vue` (visible only when `authState.isAdmin.value === true`) and admin portal link in mobile user popover in `client/src/components/layout/AppLayout.vue`.

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable.

---

## Phase 4: User Story 2 - Access Auditing & Session Monitoring (Priority: P2)

**Goal**: Administrators can view chronological access logs (with IP, user agent, timestamps, pagination, and search filter) and inspect/revoke active sessions across all users.

**Independent Test**: Perform logins, verify events are recorded in `access_audit_logs`, view paginated logs in Admin Portal, search by username, list active sessions, revoke a session, and verify the revoked session token fails with 401.

### Tests for User Story 2

- [X] T017 [P] [US2] Create integration tests for audit logging on login/logout, audit log pagination/filtering, and active session revocation in `server/tests/admin-audit.test.ts`.

### Implementation for User Story 2

- [X] T018 [US2] Integrate audit log recording (`login_success`, `login_failed`, `logout`) in `server/src/routes/auth-routes.ts` capturing client IP and User-Agent.
- [X] T019 [US2] Integrate audit log recording for administrative events (`user_created`, `user_updated`, `password_reset`, `session_revoked`, `user_deleted`) in `server/src/services/admin-service.ts`.
- [X] T020 [US2] Implement access audit and session endpoints in `server/src/routes/admin-routes.ts` (`GET /api/v1/admin/access-logs`, `GET /api/v1/admin/sessions`, `DELETE /api/v1/admin/sessions/:id`).
- [X] T021 [P] [US2] Add access logs and session management methods (`fetchAccessLogs`, `fetchActiveSessions`, `revokeSession`) to `client/src/services/admin.ts`.
- [X] T022 [US2] Create `client/src/components/admin/AccessAuditingTab.vue` with audit logs table/cards, search input, date filters, pagination controls, active sessions list, and "Revogar Sessão" buttons with touch targets $\ge 44 \times 44\text{ px}$.
- [X] T023 [US2] Integrate `AccessAuditingTab.vue` into `client/src/views/AdminView.vue`.

**Checkpoint**: User Stories 1 AND 2 are both independently functional and testable.

---

## Phase 5: User Story 3 - System-Wide Usage Reports & Analytics (Priority: P3)

**Goal**: Administrators can inspect aggregated overtime hours, compensations, net balance, active users, per-user breakdown, and export CSV reports.

**Independent Test**: Record entries across multiple users, view aggregated metrics and per-user breakdown in admin view, export CSV, and verify accurate totals.

### Tests for User Story 3

- [X] T024 [P] [US3] Create integration tests for usage summary aggregation and CSV export formatting in `server/tests/admin-reports.test.ts`.

### Implementation for User Story 3

- [X] T025 [US3] Implement usage aggregation and RFC 4180 CSV export generation in `server/src/services/admin-service.ts` and `server/src/repositories/admin-repository.ts`.
- [X] T026 [US3] Implement usage reports endpoints in `server/src/routes/admin-routes.ts` (`GET /api/v1/admin/reports/usage`, `GET /api/v1/admin/reports/usage/export`).
- [X] T027 [P] [US3] Add usage reports and CSV export download methods (`fetchUsageReports`, `exportUsageCsv`) to `client/src/services/admin.ts`.
- [X] T028 [US3] Create `client/src/components/admin/UsageReportsTab.vue` with KPI summary cards, date range filter, per-user breakdown table/cards, and "Exportar Relatório Consolidado" CSV download button with touch targets $\ge 44 \times 44\text{ px}$.
- [X] T029 [US3] Integrate `UsageReportsTab.vue` into `client/src/views/AdminView.vue`.

**Checkpoint**: All three user stories are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, responsive styling audit, and production build checks.

- [X] T030 Run full test suite (`npm test`) ensuring all unit, integration, and RBAC tests pass.
- [X] T031 Run production build (`npm run build`) ensuring zero TypeScript compilation errors and clean bundle output.
- [X] T032 Verify mobile viewport touch targets ($\ge 44 \times 44\text{ px}$) across all admin tabs and modals per Constitution Principle I.
- [X] T033 Execute end-to-end verification scenarios from `specs/008-admin-management-portal/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - **BLOCKS** all user stories.
- **User Stories (Phases 3 - 5)**:
  - Phase 3 (US1 - MVP): Depends on Phase 2. Can proceed immediately.
  - Phase 4 (US2): Depends on Phase 2. Uses US1 Admin routes/service file, but functions independently.
  - Phase 5 (US3): Depends on Phase 2. Uses US1 Admin routes/service file, but functions independently.
- **Polish (Phase 6)**: Depends on completion of all desired user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of US2 and US3. Delivers the core MVP.
- **User Story 2 (P2)**: Extends admin service/routes with auditing and session controls.
- **User Story 3 (P3)**: Extends admin service/routes with system-wide aggregation and CSV export.

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel.
- **Phase 2**: T004, T005, T006, T007, T008 can be developed in parallel once T003 is established.
- **Phase 3 (US1)**:
  - T009 (tests) and T013 (client service) can run in parallel with backend implementation.
  - T014 (UserManagementTab) can be created while T010/T011 are being finalized.
- **Phase 4 (US2)**:
  - T017 (tests) and T021 (client service) can run in parallel.
  - T022 (AccessAuditingTab) can be created in parallel with backend endpoints.
- **Phase 5 (US3)**:
  - T024 (tests) and T027 (client service) can run in parallel.
  - T028 (UsageReportsTab) can be developed in parallel with backend endpoints.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup: Migration & types).
2. Complete Phase 2 (Foundational: RBAC hook, repository extensions, client auth/routing guards).
3. Complete Phase 3 (User Story 1: User management CRUD, password reset, lockout guard, sidebar link, UI tab).
4. **VALIDATE MVP**: Confirm admin user can create/manage users and regular users receive 403 Forbidden.

### Incremental Delivery
1. Foundation + US1 (MVP) -> Full user management operational.
2. Add US2 -> Access audit logs and session revocation operational.
3. Add US3 -> System-wide usage reports and CSV export operational.
4. Run Phase 6 (Polish & verification).
