# Tasks: Fix On-Demand Backup and Add Database Restore

**Feature**: Fix On-Demand Backup & Database Restore  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Branch**: `007-fix-backup-and-restore`

## Phase 1: Setup (Shared Types & Contracts)

**Purpose**: Establish data types and interfaces across backend and frontend.

- [X] T001 [P] Update backup TypeScript interfaces to include `RestoreBackupResult` and restore error definitions in server/src/types/backup.ts
- [X] T002 [P] Update client backup TypeScript interfaces to include `RestoreBackupResult` matching backend contract in client/src/services/backup-api.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Setup regression and verification baseline tests for backup endpoints.

- [X] T003 Add test cases reproducing empty body `POST /api/v1/backups/export` and baseline restore stubs in tests/backup.test.ts

**Checkpoint**: Foundation ready - user story implementation can proceed.

---

## Phase 3: User Story 1 - Reliable On-Demand Manual Backup Execution (Priority: P1) 🎯 MVP

**Goal**: Eliminate the `body cannot be empty` Fastify error when clicking "Fazer Backup Agora" and ensure reliable on-demand backup execution with immediate feedback.

**Independent Test**: Trigger manual backup via API (`POST /api/v1/backups/export` without body and with empty JSON) and via "Fazer Backup Agora" button in the client. Both must return HTTP 202 and produce a valid backup archive.

### Implementation for User Story 1

- [X] T004 [P] [US1] Fix payload dispatch in client/src/services/backup-api.ts so `triggerManualBackup()` sends `{}` or omits JSON content-type header when payload is empty
- [X] T005 [P] [US1] Update Fastify route `POST /backups/export` in server/src/routes/backup-routes.ts to accept requests with empty or omitted body without triggering 400 Bad Request
- [X] T006 [US1] Enhance `handleManualBackup` in client/src/views/SettingsView.vue to display loading indicator, clear error states, and show success toast with generated filename

**Checkpoint**: User Story 1 is functional and testable independently as the MVP.

---

## Phase 4: User Story 2 - Comprehensive Backup History & Audit List (Priority: P2)

**Goal**: Provide full visibility into past backups on the Settings screen, refreshing the list in real-time when backups complete, and supporting archive downloads with touch targets >= 44x44px.

**Independent Test**: Load Settings screen with existing backups and execute a new backup. Verify that the history table updates immediately with date, size, records, and download button.

### Implementation for User Story 2

- [X] T007 [US2] Update backup history loader in client/src/views/SettingsView.vue to automatically refresh the list upon backup completion and provide an accessible manual reload button with loading animation
- [X] T008 [US2] Refactor backup runs list items in client/src/views/SettingsView.vue to display status badges, human-readable file sizes, record counts, SHA-256 fingerprint, and ensure the "Baixar" button meets 44x44px touch targets

**Checkpoint**: User Stories 1 and 2 are functional and deliver audit visibility and download capabilities.

---

## Phase 5: User Story 3 - Safe & Verified Database Restore (Priority: P3)

**Goal**: Enable administrators to restore the database from any completed backup, safeguarded by an automatic pre-restore safety snapshot, archive integrity checks, and a mobile-friendly confirmation modal.

**Independent Test**: Create a backup, add test overtime records, select the previous backup in the history list, confirm the restore modal, and verify the database rolls back to the prior state while generating an automatic pre-restore safety snapshot.

### Implementation for User Story 3

- [X] T009 [US3] Implement `restoreBackup(id: string)` in server/src/services/backup-service.ts with gunzip decompression, SHA-256 checksum check, `PRAGMA integrity_check`, pre-restore safety backup snapshot, and atomic SQLite Online Backup into the active database
- [X] T010 [US3] Add endpoint `POST /api/v1/backups/:id/restore` in server/src/routes/backup-routes.ts with concurrency guards (409), archive validation (404, 422), and response formatting
- [X] T011 [US3] Add client method `restoreBackup(id: string)` in client/src/services/backup-api.ts calling `POST /api/v1/backups/:id/restore`
- [X] T012 [US3] Create Restore Confirmation Modal in client/src/views/SettingsView.vue with backup timestamp, record count, destructive action warning, offline sync reminder, and mobile touch targets >= 44x44px
- [X] T013 [US3] Connect "Restaurar" button per completed backup run in client/src/views/SettingsView.vue to open the modal, handle in-progress state, and refresh backup history and application data upon completion

**Checkpoint**: All three user stories are complete, safe, and testable.

---

## Phase 6: Polish & Verification

**Purpose**: End-to-end regression validation and build verification.

- [X] T014 [P] Add integration test cases in tests/backup.test.ts for database restore, pre-restore backup creation, corrupt archive rejection, and 409 concurrency lock
- [X] T015 Run automated test suite via `npm run test tests/backup.test.ts` to verify all backup and restore scenarios pass cleanly
- [X] T016 Run full project build via `npm run build` to verify TypeScript compilation and client asset bundle integrity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - delivers MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion.
- **User Story 3 (Phase 5)**: Depends on Phase 3 and Phase 4 completion.
- **Polish (Phase 6)**: Depends on all user stories completed.

### Parallel Opportunities

- T001 and T002 can execute in parallel (backend and frontend types).
- T004 and T005 can execute in parallel (client and server fixes for empty body).
- T014 can be developed in parallel with UI integration tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (T001, T002) and Phase 2 (T003).
2. Complete Phase 3 (T004, T005, T006).
3. Validate manual backup trigger on-demand without errors (`202 Accepted`).

### Incremental Delivery
1. Deliver US1: Fix manual backup trigger.
2. Deliver US2: Polish history list visibility and real-time refresh.
3. Deliver US3: Introduce safe restore engine, API, and confirmation modal.
4. Execute Polish phase: Integration tests and production build.
