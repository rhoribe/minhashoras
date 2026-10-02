# Implementation Tasks: Database Factory Reset and System Purge

**Feature**: `009-database-factory-reset` | **Spec**: [spec.md](file:///home/rhoribe/lab/minhashoras/specs/009-database-factory-reset/spec.md) | **Plan**: [plan.md](file:///home/rhoribe/lab/minhashoras/specs/009-database-factory-reset/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema expansion, metadata table, and type definitions for system reset.

- [X] T001 Create migration `server/src/db/migrations/005_system_metadata.ts` creating `system_metadata` table (`key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL`) and register it in `server/src/db/migrate.ts`.
- [X] T002 [P] Define `SystemResetRequest` and `SystemResetResult` DTO interfaces in `server/src/types/admin.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repository operations and client storage clearing that MUST be complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Implement metadata key-value accessors (`getMetadata`, `setMetadata`) in `server/src/repositories/admin-repository.ts`.
- [X] T004 Implement atomic SQLite transaction for system reset (`executeDatabaseReset(adminUserId: string)`) in `server/src/repositories/admin-repository.ts`, clearing `overtime_records`, `compensation_schedules`, `access_audit_logs`, `user_sessions`, deleting non-admin users, resetting admin `time_bank_balance` to 0, and updating `system_epoch`.
- [X] T005 [P] Implement `clearAllLocalData()` in `client/src/services/db.ts` to asynchronously clear all Dexie tables (`overtimeRecords`, `compensations`, `syncQueue`, `preferences`, `activeSession`).

**Checkpoint**: Core reset primitives established. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Full Database Reset to Fresh Baseline (Priority: P1) 🎯 MVP

**Goal**: An authenticated administrator can trigger a factory reset with a typed confirmation keyword ("ZERAR"), permanently clearing operational database tables and returning the system to a clean baseline.

**Independent Test**: Seed overtime entries and secondary users, submit `POST /api/v1/admin/system/reset` with `confirmation: 'ZERAR'`, verify that operational tables are empty, sessions are revoked, and the admin account can log into an empty dashboard.

### Tests for User Story 1

- [X] T006 [P] [US1] Create integration tests in `server/tests/admin-reset.test.ts` verifying keyword validation ("ZERAR"), 403 Forbidden for non-admins, atomic data deletion, and admin account preservation.

### Implementation for User Story 1

- [X] T007 [US1] Implement `executeSystemReset` service method in `server/src/services/admin-service.ts` validating confirmation phrase, executing database purge, recording `SYSTEM_RESET` audit log, and returning summary statistics.
- [X] T008 [US1] Expose `POST /admin/system/reset` endpoint in `server/src/routes/admin-routes.ts` protected by `requireAdmin` hook and rate-limited error handling.
- [X] T009 [P] [US1] Add `executeSystemReset(request: SystemResetRequest)` client API method in `client/src/services/admin.ts`.
- [X] T010 [US1] Create `client/src/components/admin/SystemMaintenanceTab.vue` with Danger Zone card, two-step confirmation modal requiring typing "ZERAR", error handling, and touch targets $\ge 44 \times 44\text{ px}$.
- [X] T011 [US1] Integrate `SystemMaintenanceTab.vue` into `client/src/views/AdminView.vue` as a new tab ("Sistema").

**Checkpoint**: User Story 1 (MVP) is fully functional and independently testable.

---

## Phase 4: User Story 2 - Backup Archives Deletion (Priority: P2)

**Goal**: Allow administrators to optionally delete all stored physical backup archive files on disk and clear `backup_runs` records during factory reset.

**Independent Test**: Generate backup archives on disk, trigger reset with `deleteBackups: true`, verify disk backup directory is empty and `backup_runs` table has 0 rows.

### Tests for User Story 2

- [X] T012 [P] [US2] Add integration test cases in `server/tests/admin-reset.test.ts` verifying deletion of disk backup files and `backup_runs` rows when `deleteBackups` is true versus preserved when false.

### Implementation for User Story 2

- [X] T013 [US2] Extend `executeSystemReset` in `server/src/services/admin-service.ts` and `server/src/repositories/admin-repository.ts` to remove backup files from `backups/` via Node.js `fs.unlinkSync` and delete all rows from `backup_runs`.
- [X] T014 [US2] Add "Excluir também todos os backups do servidor" checkbox toggle to `client/src/components/admin/SystemMaintenanceTab.vue` (default: checked).

**Checkpoint**: User Story 2 is functional alongside User Story 1.

---

## Phase 5: User Story 3 - Client Cache Purge and Reconnection Protection (Priority: P3)

**Goal**: Ensure client devices immediately purge local storage upon reset and prevent reconnecting offline devices with pre-reset records from polluting the clean database.

**Independent Test**: Put client in offline mode with pending sync records, trigger reset on server, reconnect client, verify client detects epoch change, purges local queue, and prompts user to log in.

### Tests & Implementation for User Story 3

- [X] T015 [P] [US3] Add system epoch tracking check to `client/src/services/sync.ts` and `client/src/services/auth.ts` to invalidate offline queue and local store when an epoch mismatch or 401 is received.
- [X] T016 [US3] Wire post-reset client cleanup in `client/src/components/admin/SystemMaintenanceTab.vue` to invoke `clearAllLocalData()`, clear `localStorage`, display success notification, and redirect to `/login`.

**Checkpoint**: All three user stories are independently functional and integrated.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, responsive styling audit, and production build checks.

- [X] T017 Run full test suite (`npm test`) ensuring all unit, integration, RBAC, and reset tests pass.
- [X] T018 Run production build (`npm run build`) ensuring zero TypeScript compilation errors and clean bundle output.
- [X] T019 Verify mobile viewport touch targets ($\ge 44 \times 44\text{ px}$) across Danger Zone cards and confirmation modal per Constitution Principle I.
- [X] T020 Execute end-to-end verification scenarios from `specs/009-database-factory-reset/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - **BLOCKS** all user stories.
- **User Stories (Phases 3 - 5)**:
  - Phase 3 (US1 - MVP): Depends on Phase 2. Can proceed immediately.
  - Phase 4 (US2): Extends reset service/routes with backup disk purging.
  - Phase 5 (US3): Extends client sync service and post-reset navigation.
- **Polish (Phase 6)**: Depends on completion of all desired user stories.

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel.
- **Phase 2**: T003, T004, and T005 can be developed in parallel once T001 is ready.
- **Phase 3 (US1)**:
  - T006 (tests) and T009 (client service) can run in parallel with backend implementation.
  - T010 (SystemMaintenanceTab) can be created in parallel with backend endpoints.
- **Phase 4 (US2)**:
  - T012 (tests) can run in parallel with UI toggle T014.
- **Phase 5 (US3)**:
  - T015 and T016 can be refined in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`005_system_metadata.ts`, DTOs).
2. Complete Phase 2: Foundational (atomic database reset transaction & Dexie wipe helper).
3. Complete Phase 3: User Story 1 (backend service, route, tests, and Danger Zone UI tab).
4. **STOP and VALIDATE**: Verify reset works end-to-end with keyword "ZERAR".

### Incremental Delivery
- Add Phase 4 (US2): Purge physical backup files on disk.
- Add Phase 5 (US3): Reconnection epoch check to safeguard offline sync.
- Final Phase 6: Full verification, test suite run, and production build check.
