# Implementation Tasks: Default Admin Bootstrap with Mandatory Password Change & User Self-Service Deletion

**Feature**: `010-admin-setup-and-user-self-delete` | **Spec**: [spec.md](file:///home/rhoribe/lab/minhashoras/specs/010-admin-setup-and-user-self-delete/spec.md) | **Plan**: [plan.md](file:///home/rhoribe/lab/minhashoras/specs/010-admin-setup-and-user-self-delete/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema expansion, admin user seed migration, and shared type definitions.

- [X] T001 Create migration `server/src/db/migrations/006_admin_bootstrap_and_password_change.ts` to add `must_change_password` column to `users`, seed default `admin` with `admin123` (`must_change_password = 1`), and register in `server/src/db/migrate.ts`.
- [X] T002 [P] Extend `UserEntity`, `User` interface, and add `ChangePasswordRequest` DTO in `server/src/types/auth.ts` and `client/src/services/auth.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repository methods and service-layer primitives that MUST be complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Update `server/src/repositories/user-repository.ts` to handle `must_change_password` in user queries, `updatePasswordAndClearFlag(userId, passwordHash)`, and implement atomic `deleteUserAndAllData(userId)`.
- [X] T004 Implement `changePassword` and `deleteSelfAccount` business logic in `server/src/services/auth-service.ts` enforcing password validation and Sole Admin Lockout protection.
- [X] T005 [P] Add `changePassword(newPassword)` and `deleteSelfAccount()` methods in `client/src/services/auth.ts`.

**Checkpoint**: Core auth and deletion primitives established. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Default Admin Bootstrap & Mandatory First-Access Password Change (Priority: P1) 🎯 MVP

**Goal**: Newly seeded administrator `admin` with password `admin123` is forced to change their password on first login before accessing any application features.

**Independent Test**: Authenticate as `admin` / `admin123`, verify `must_change_password: true`, attempt to query dashboard or other routes (verify redirection to `/change-password`), submit a valid new password via `POST /api/v1/auth/change-password`, verify flag is cleared and access is granted.

### Tests for User Story 1

- [X] T006 [P] [US1] Create integration tests in `server/tests/admin-bootstrap-and-deletion.test.ts` verifying login with default `admin` / `admin123` sets `must_change_password = true`, `POST /api/v1/auth/change-password` updates password and clears flag, and subsequent login succeeds with the new password.

### Implementation for User Story 1

- [X] T007 [US1] Expose `POST /api/v1/auth/change-password` in `server/src/routes/auth-routes.ts` protected by `authenticate` hook and audit event logging (`PASSWORD_CHANGED`).
- [X] T008 [US1] Create `client/src/views/ChangePasswordView.vue` with password confirmation, password strength validation, and mobile touch targets $\ge 44 \times 44\text{ px}$.
- [X] T009 [US1] Register `/change-password` route in `client/src/main.ts` and update `router.beforeEach` navigation guard to intercept any session with `must_change_password === true`.

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable.

---

## Phase 4: User Story 2 - Standard User Self-Registration Policy & Privilege Boundary (Priority: P2)

**Goal**: Public self-registration strictly assigns standard user role (`role: 'user'`), ignoring any client-provided role parameters to guarantee non-admin privileges.

**Independent Test**: Register a user via `POST /api/v1/auth/register` with `{ "role": "admin" }` in the payload; verify that the resulting user has `role: 'user'` and receives HTTP 403 when trying to access `/api/v1/admin/users`.

### Tests for User Story 2

- [X] T010 [P] [US2] Add integration test cases in `server/tests/admin-bootstrap-and-deletion.test.ts` verifying that public registration always assigns `role = 'user'` regardless of payload, and that standard users receive HTTP 403 on admin routes.

### Implementation for User Story 2

- [X] T011 [US2] Enforce strict assignment of `role = 'user'` in `server/src/routes/auth-routes.ts` and `server/src/services/auth-service.ts` for public registration (`/api/v1/auth/register`).

**Checkpoint**: User Story 2 is functional alongside User Story 1.

---

## Phase 5: User Story 3 - Self-Service Account & Data Deletion (Priority: P3)

**Goal**: Standard users can permanently delete their own account and all personal overtime records, compensations, and settings from the application, clearing local cache.

**Independent Test**: As a standard user with recorded overtime entries, invoke self-deletion; verify all database records for that user are deleted, the session is invalidated, and the sole administrator cannot delete their own account.

### Tests & Implementation for User Story 3

- [X] T012 [P] [US3] Add integration test cases in `server/tests/admin-bootstrap-and-deletion.test.ts` verifying that `DELETE /api/v1/auth/me` wipes all overtime records, compensations, preferences, and the user entity, while blocking deletion if the user is the sole active admin.
- [X] T013 [US3] Expose `DELETE /api/v1/auth/me` endpoint in `server/src/routes/auth-routes.ts` protected by `authenticate` hook with audit logging (`USER_SELF_DELETED`).
- [X] T014 [US3] Add "Excluir Minha Conta e Meus Dados" danger card and confirmation modal in `client/src/views/SettingsView.vue` with touch targets $\ge 44 \times 44\text{ px}$, invoking `deleteSelfAccount()`, `clearAllLocalData()`, and redirecting to `/login`.

**Checkpoint**: All three user stories are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, responsive styling audit, and production build checks.

- [X] T015 Run full test suite (`npm test`) ensuring all unit, integration, RBAC, and auth tests pass.
- [X] T016 Run production build (`npm run build`) ensuring zero TypeScript compilation errors and clean bundle output.
- [X] T017 Verify mobile viewport touch targets ($\ge 44 \times 44\text{ px}$) across ChangePasswordView and SettingsView deletion modal per Constitution Principle I.
- [X] T018 Execute end-to-end verification scenarios from `specs/010-admin-setup-and-user-self-delete/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - **BLOCKS** all user stories.
- **User Stories (Phases 3 - 5)**:
  - Phase 3 (US1 - MVP): Depends on Phase 2. Can proceed immediately.
  - Phase 4 (US2): Can proceed in parallel with US1.
  - Phase 5 (US3): Depends on Phase 2.
- **Polish (Phase 6)**: Depends on completion of all desired user stories.

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel.
- **Phase 2**: T003, T004, and T005 can be developed in parallel once T001 is ready.
- **Phase 3 (US1)**:
  - T006 (tests) and T008 (ChangePasswordView) can run in parallel with backend endpoint implementation.
- **Phase 4 (US2)**:
  - T010 (tests) can run in parallel with T011.
- **Phase 5 (US3)**:
  - T012 (tests) and T014 (SettingsView UI) can run in parallel with T013.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`006_admin_bootstrap_and_password_change.ts`, DTOs).
2. Complete Phase 2: Foundational (`updatePasswordAndClearFlag`, `deleteUserAndAllData`).
3. Complete Phase 3: User Story 1 (backend service, route, tests, and ChangePasswordView).
4. **STOP and VALIDATE**: Verify login with `admin` / `admin123` prompts forced password change.

### Incremental Delivery
- Add Phase 4 (US2): Strict `role = 'user'` on public registration.
- Add Phase 5 (US3): Self-service account & personal data deletion.
- Final Phase 6: Full verification, test suite run, and production build check.
