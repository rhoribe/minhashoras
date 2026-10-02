# Tasks: Report Consistency and Backup Authentication

**Feature**: `012-report-consistency-and-backup-auth`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test scaffolding and initial setup for feature 012 verification

- [X] T001 Create integration test file skeletons in `server/tests/report-consistency.test.ts` and `server/tests/backup-auth.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend authentication alignment that blocks all user stories

**⚠️ CRITICAL**: Enforces strict authentication on report routes before client integration

- [X] T002 Enforce `authenticate` preHandler on `/api/v1/reports/export` and remove unauthenticated `default_user` fallback in `server/src/routes/reports.ts`
- [X] T003 Update existing contract test suite to provide Bearer token authentication and test 401 rejection in `server/tests/contract/reports.test.ts`

**Checkpoint**: Foundation ready - report routes are strictly secured by session authentication

---

## Phase 3: User Story 1 - Consistent and User-Isolated Overtime Reports (Priority: P1) 🎯 MVP

**Goal**: Guarantee that on-screen report previews and exported documents (PDF, Excel, CSV) are strictly isolated to the authenticated user, 100% consistent with each other, and resilient offline.

**Independent Test**: Log in as a user with records, open the Reports view, verify preview summary, export in PDF, Excel, and CSV, and confirm files match preview with zero cross-user records.

### Implementation for User Story 1

- [X] T004 [P] [US1] Inject `getAuthHeader()` and handle 401 session expiration errors during online report export in `client/src/services/client-report-generator.ts`
- [X] T005 [P] [US1] Filter offline records strictly by `getCurrentUserId()` in `client/src/services/client-report-generator.ts`
- [X] T006 [US1] Add sync trigger on mount and date change to guarantee preview parity with server records in `client/src/views/ReportsView.vue`
- [X] T007 [P] [US1] Implement automated integration tests for authenticated report generation, user data isolation, and 401 handling in `server/tests/report-consistency.test.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently. Reports are 100% accurate and user-isolated.

---

## Phase 4: User Story 2 - Authenticated On-Demand and Scheduled System Backups (Priority: P2)

**Goal**: Enable administrators to trigger manual backups ("Fazer Backup Agora"), modify schedules, view history, and download/restore backups without authentication token errors.

**Independent Test**: Log in as an administrator, click "Fazer Backup Agora" in Admin Settings, verify snapshot completes, alert shows success, history updates, and download succeeds without 401 errors.

### Implementation for User Story 2

- [X] T008 [P] [US2] Inject `getAuthHeader()` and handle 401/409 responses across all 7 endpoints in `client/src/services/backup-api.ts`
- [X] T009 [US2] Enhance manual backup button debounce and session error banner handling in `client/src/views/SettingsView.vue`
- [X] T010 [P] [US2] Implement automated integration tests for admin manual backup trigger, schedule update, and non-admin 403 rejection in `server/tests/backup-auth.test.ts`

**Checkpoint**: User Stories 1 AND 2 are complete and work independently without token errors.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and quality gates across the full application

- [X] T011 Run full test suite (`npm test`) and resolve any regressions across all 27+ test suites
- [X] T012 Run production build verification (`npm run build`) for both client and server
- [X] T013 Run quickstart.md validation scenarios to verify end-to-end user workflows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS User Story 1 and 2
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (MVP scope)
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion; can run in parallel with or after US1
- **Polish (Phase 5)**: Depends on completion of User Stories 1 and 2

### Parallel Opportunities

- T004 and T005 can run in parallel (client export generator improvements)
- T007 (US1 tests) and T008 (US2 backup-api) can run in parallel
- T008 and T010 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup test scaffolding (T001)
2. Complete Phase 2: Secure reports route (T002, T003)
3. Complete Phase 3: Report consistency & user isolation (T004 - T007)
4. Validate User Story 1 independently

### Incremental Delivery
1. Add User Story 2: Admin backup authentication (T008 - T010)
2. Complete Polish & Verification (T011 - T013)
