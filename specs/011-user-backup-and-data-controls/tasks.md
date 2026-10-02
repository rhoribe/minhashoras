# Tasks: User-Scoped Backups, Self-Service Password Change, and Personal Data Controls

**Input**: Design documents from `specs/011-user-backup-and-data-controls/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/user-backup-and-data-controls-api.md`

## Format: `[TaskID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes explicit file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and shared DTOs for user controls and data export

- [X] T001 [P] Define `PersonalBackupArchive`, `ResetUserRecordsRequest`, and `ResetUserRecordsResponse` interfaces in `server/src/types/user-controls.ts`
- [X] T002 [P] Update `ChangePasswordRequest` DTO to include optional `current_password` in `server/src/types/user-controls.ts` and `client/src/services/auth.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and data layer methods that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Restrict all endpoints in `server/src/routes/backup-routes.ts` with `requireAdmin` preHandler hook to reject non-admin users with 403 Forbidden
- [X] T004 Add `deleteAllForUser(userId: string): number` methods in `server/src/repositories/records-repository.ts` and `server/src/repositories/compensations-repository.ts`
- [X] T005 [P] Implement `clearLocalUserRecords(userId: string): Promise<void>` in `client/src/services/db.ts` to purge Dexie IndexedDB records and compensations for a user while preserving active session and preferences

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - System-Wide vs. User-Scoped Backup Boundaries (Priority: P1) 🎯 MVP

**Goal**: Deliver a secure personal data export ("Backup Pessoal") for standard users while completely restricting system-wide database backups and schedules to administrators in both API and UI.

**Independent Test**: Log in as a standard user, verify global backup controls are hidden in `SettingsView.vue`, call `GET /api/v1/user/export-backup` to verify download of personal JSON archive containing only user's records, and verify `GET /api/v1/backups/*` returns 403 Forbidden.

### Tests for User Story 1

- [X] T006 [P] [US1] Create integration test verifying personal data export format and system backup 403 RBAC boundary in `server/tests/user-backup-and-data-controls.test.ts`

### Implementation for User Story 1

- [X] T007 [US1] Implement `buildPersonalBackupArchive(userId: string)` in `server/src/services/user-service.ts` querying profile, preferences, balance, overtime records, and compensations without password hash
- [X] T008 [US1] Implement `GET /api/v1/user/export-backup` endpoint with `authenticate` preHandler and attachment header in `server/src/routes/user-routes.ts`
- [X] T009 [US1] Register `userRoutes` in `server/src/index.ts`
- [X] T010 [P] [US1] Create `client/src/services/user-api.ts` with `exportPersonalBackup()` triggering browser JSON download
- [X] T011 [US1] Update `client/src/views/SettingsView.vue` to guard system backup cards with `v-if="authState.isAdmin.value"` and add "Baixar Meu Backup Pessoal" button with touch target >= 44x44px

**Checkpoint**: User Story 1 is fully functional and testable as the core MVP boundary!

---

## Phase 4: User Story 2 - Voluntary Self-Service Password Change (Priority: P2)

**Goal**: Allow any authenticated user to update their password at any time from settings by providing their current password and a new valid password meeting complexity requirements.

**Independent Test**: Navigate to settings as standard user, open "Alterar Senha" modal, submit incorrect current password (verify 400 error), submit correct current password with new password (verify 200 OK and successful subsequent login).

### Tests for User Story 2

- [X] T012 [P] [US2] Add integration tests in `server/tests/user-backup-and-data-controls.test.ts` verifying `current_password` validation, complexity rules, and session invalidation

### Implementation for User Story 2

- [X] T013 [US2] Update `AuthService.changePassword` in `server/src/services/auth-service.ts` to require and verify `current_password` when `must_change_password === 0`
- [X] T014 [US2] Update `POST /api/v1/auth/change-password` route in `server/src/routes/auth-routes.ts` to accept `current_password`, invalidate alternate sessions, and insert `PASSWORD_CHANGED` audit log
- [X] T015 [P] [US2] Update `changePassword` function in `client/src/services/auth.ts` to accept `(newPassword: string, currentPassword?: string)`
- [X] T016 [US2] Add "Alterar Senha" button and modal dialog in `client/src/views/SettingsView.vue` with current password input, strength feedback, and touch targets >= 44x44px

**Checkpoint**: User Stories 1 AND 2 are both functional and independently testable!

---

## Phase 5: User Story 3 - Personal Records Reset & Account Deletion (Priority: P3)

**Goal**: Enable users to wipe only their overtime records and compensations and reset their balance to zero without deleting their login account, while keeping account deletion distinct.

**Independent Test**: Populate records for a test user, call `POST /api/v1/user/reset-records` with confirmation payload `"ZERAR-MEUS-REGISTROS"`, verify server records and compensations are deleted, balance is 0, Dexie cache is cleared, and user remains logged in.

### Tests for User Story 3

- [X] T017 [P] [US3] Add integration tests in `server/tests/user-backup-and-data-controls.test.ts` verifying atomic records purge, zeroed balance, and account preservation

### Implementation for User Story 3

- [X] T018 [US3] Implement `resetUserRecords(userId: string)` in `server/src/services/user-service.ts` executing atomic SQLite deletion of records and compensations, balance recalculation to 0, and `USER_RECORDS_RESET` audit log
- [X] T019 [US3] Implement `POST /api/v1/user/reset-records` route in `server/src/routes/user-routes.ts` validating confirmation payload `"ZERAR-MEUS-REGISTROS"`
- [X] T020 [P] [US3] Implement `resetPersonalRecords()` in `client/src/services/user-api.ts` connecting API call with `clearLocalUserRecords(userId)` in `client/src/services/db.ts`
- [X] T021 [US3] Add "Zerar Meus Registros" button and confirmation modal in `client/src/views/SettingsView.vue` danger zone with explicit confirmation prompt and touch targets >= 44x44px

**Checkpoint**: All three user stories are functional and isolated!

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates, full test verification, production build validation, and accessibility checks

- [X] T022 [P] Update documentation in `README.md` and feature guide in `specs/011-user-backup-and-data-controls/quickstart.md`
- [X] T023 Run full automated test suite via `npm test` verifying 100% pass across all test suites
- [X] T024 Run production build via `npm run build` verifying clean TypeScript compilation and bundle generation
- [X] T025 Audit all new touch targets in `client/src/views/SettingsView.vue` to ensure compliance with $\ge 44 \times 44\text{ px}$ (`min-h-touch min-w-touch`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T002) - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion (T003-T005)
  - Stories can proceed sequentially (US1 → US2 → US3) or in parallel
- **Polish (Phase 6)**: Depends on completion of all desired user story phases

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 - Delivers core MVP (personal backup + admin-only backup boundary)
- **User Story 2 (P2)**: Depends on Phase 2 - Self-service voluntary password change
- **User Story 3 (P3)**: Depends on Phase 2 & T004 - Personal records reset without account deletion

### Parallel Opportunities

- Within Phase 1: `T001` and `T002` can be executed in parallel
- Within Phase 2: `T005` can be executed in parallel with backend repository tasks `T004`
- Once Phase 2 is complete:
  - `T006` (US1 test) and `T010` (client API) can run in parallel
  - `T012` (US2 test) and `T015` (client auth update) can run in parallel
  - `T017` (US3 test) and `T020` (client reset API) can run in parallel
- In Phase 6: `T022` documentation can run in parallel with verification tasks

---

## Parallel Example: User Story 1

```bash
# Launch test task and client API task in parallel:
Task: "T006 [P] [US1] Create integration test verifying personal data export format and system backup 403 RBAC boundary in server/tests/user-backup-and-data-controls.test.ts"
Task: "T010 [P] [US1] Create client/src/services/user-api.ts with exportPersonalBackup() triggering browser JSON download"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`, `T002`)
2. Complete Phase 2: Foundational (`T003`, `T004`, `T005`)
3. Complete Phase 3: User Story 1 (`T006` through `T011`)
4. **STOP and VALIDATE**: Verify personal backup download and admin-only backup block
5. Demo / Deliver MVP

### Incremental Delivery

1. Setup + Foundational ready
2. Add US1 → Verify Personal Data Backup & RBAC boundary (MVP ready!)
3. Add US2 → Verify Voluntary Password Change
4. Add US3 → Verify Personal Records Reset
5. Complete Polish → Run `npm test`, `npm run build`, audit touch targets
