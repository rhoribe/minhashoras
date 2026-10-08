# Tasks: Dynamic Positive Limit Ceiling on Dashboard

**Input**: Design artifacts from `specs/013-dashboard-ceiling-limit/`
**Feature Branch**: `013-dashboard-ceiling-limit`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify and prepare local database schemas and type definitions for time bank limit preferences.

- [X] T001 Verify and update `LocalUserPreferences` interface in `client/src/services/db.ts` to ensure `max_positive_limit_minutes`, `max_negative_limit_minutes`, and `warning_threshold_percentage` are typed and supported in Dexie.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test harness and foundation that MUST be in place before implementing user stories.

**⚠️ CRITICAL**: Blocks implementation of all user stories.

- [X] T002 Create unit test suite in `tests/client/balance-service.test.ts` verifying that `calculateLocalBalance()` resolves dynamic positive limits from `localDb.preferences`, falls back to 2400 (40h) when unconfigured, and flags `isWarning` and `isExceeded` properly.

**Checkpoint**: Foundation ready - user story implementation can begin.

---

## Phase 3: User Story 1 - Dynamic Ceiling Display & Progress Tracking (Priority: P1) 🎯 MVP

**Goal**: Display the active user's configured positive ceiling (`+Xh` or `+Xh Ym`) in the dashboard balance card and compute the progress bar percentage accurately against that ceiling.

**Independent Test**: Configure positive limit in Settings (e.g., 20h, 60h), navigate to `/dashboard`, and verify that `BalanceCard` displays `Uso do teto (+20h)` or `Uso do teto (+60h)` with progress bar calculated against that ceiling.

### Implementation for User Story 1

- [X] T003 [US1] Update `calculateLocalBalance()` in `client/src/services/balance-service.ts` to query `localDb.preferences.get(userId)` and use the user's `max_positive_limit_minutes`, `max_negative_limit_minutes`, and `warning_threshold_percentage` (defaulting to 2400, -600, 80).
- [X] T004 [US1] Update `BalanceCard.vue` in `client/src/components/balance/BalanceCard.vue` to compute a dynamic ceiling label `ceilingFormatted` (`+Xh` if whole hours or `+Xh Ym` otherwise) and calculate `usagePercentage` using `props.maxMinutes`.
- [X] T005 [US1] Update `DashboardView.vue` in `client/src/views/DashboardView.vue` to ensure `balance.value` passes dynamic limit properties into `LimitAlertBanner` and `BalanceCard`, and re-invokes `loadData()` whenever navigating to the dashboard.

**Checkpoint**: User Story 1 is functional and testable independently (MVP complete).

---

## Phase 4: User Story 2 - Offline-First Persistence & Consistency of Limit Settings (Priority: P2)

**Goal**: Ensure time bank limit settings are persisted locally in `localDb.preferences` upon loading/saving in Settings and during background sync, guaranteeing accurate ceiling display in offline mode.

**Independent Test**: Save a custom positive limit in Settings, disconnect network access, reload `/dashboard`, and verify the custom ceiling is preserved from IndexedDB.

### Implementation for User Story 2

- [X] T006 [US2] Update `SettingsView.vue` in `client/src/views/SettingsView.vue` to cache server-loaded settings into `localDb.preferences` in `loadSettings()` and update `localDb.preferences` with new values on `saveSettings()`.
- [X] T007 [US2] Update `SyncManager.pullFromServer()` in `client/src/services/sync.ts` to fetch `/api/v1/settings` and persist user settings into `localDb.preferences` for the active user during background synchronization.

**Checkpoint**: User Stories 1 AND 2 are complete, consistent, and offline-resilient.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification, build check, and regression prevention across the entire project.

- [X] T008 [P] Verify application build with `npm run build` and run test suite with `npm test`.
- [X] T009 Validate end-to-end scenarios described in `specs/013-dashboard-ceiling-limit/quickstart.md` (Settings modification, dashboard reflection, and offline preservation).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001 - BLOCKS User Stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Delivers MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 3 components. Ensures offline synchronization.
- **Polish (Phase 5)**: Depends on User Story 1 and 2 completion.

### Task Dependencies

- `T002` depends on `T001`
- `T003` depends on `T002`
- `T004` and `T005` depend on `T003`
- `T006` and `T007` depend on `T003`
- `T008` and `T009` depend on `T004`, `T005`, `T006`, `T007`

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (`T001`) and Phase 2 (`T002`).
2. Complete Phase 3 (`T003`, `T004`, `T005`).
3. **VALIDATE MVP**: Confirm that the ceiling indicator on the dashboard is dynamic and computes against configured limits.

### Incremental Delivery (User Story 2 & Polish)

4. Complete Phase 4 (`T006`, `T007`) to bind `SettingsView` and `syncManager` with IndexedDB caching.
5. Complete Phase 5 (`T008`, `T009`) to verify builds and test suites.
