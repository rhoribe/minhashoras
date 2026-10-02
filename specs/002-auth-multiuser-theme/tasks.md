# Tasks: Authentication, Multi-User Support & Impeccable Theming

**Input**: Design documents from `/specs/002-auth-multiuser-theme/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks are included per acceptance scenarios and verification requirements defined in [spec.md](./spec.md) and [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend client**: `client/src/`, `client/`
- **Backend server**: `server/src/`, `server/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Design tokens, theme styling foundation, and project configuration

- [X] T001 [P] Configure Tailwind CSS design tokens and semantic CSS custom properties in `client/tailwind.config.js` and `client/src/style.css` based on `specs/002-auth-multiuser-theme/contracts/theme-tokens.json`
- [X] T002 [P] Add anti-FOUC inline theme bootstrapper script inspecting `localStorage.getItem('minhas_horas_theme')` and `window.matchMedia('(prefers-color-scheme: dark)')` to `client/index.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure and data schemas that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement SQLite migration `002_auth_and_user_preferences.ts` in `server/src/db/migrations/002_auth_and_user_preferences.ts` and register in `server/src/db/migrate.ts` creating tables: `users` (`id` TEXT UUID PRIMARY KEY, `username` TEXT UNIQUE NOT NULL regex `^[a-zA-Z0-9._-]{3,32}$`, `email` TEXT UNIQUE NOT NULL lowercase, `password_hash` TEXT NOT NULL, `display_name` TEXT NOT NULL length 2-64, `created_at` TEXT NOT NULL, `updated_at` TEXT NOT NULL), `user_sessions` (`id` TEXT UUID PRIMARY KEY, `user_id` TEXT NOT NULL REFERENCES `users(id)` ON DELETE CASCADE, `token` TEXT UNIQUE NOT NULL, `user_agent` TEXT NULLABLE, `ip_address` TEXT NULLABLE, `expires_at` TEXT NOT NULL, `created_at` TEXT NOT NULL, `last_used_at` TEXT NOT NULL), and `user_preferences` (`user_id` TEXT PRIMARY KEY REFERENCES `users(id)` ON DELETE CASCADE, `theme_mode` TEXT NOT NULL DEFAULT `'system'` enum `['light', 'dark', 'system']`, `daily_standard_work_minutes` INTEGER NOT NULL DEFAULT 480 min 60 max 1440, `max_positive_limit_minutes` INTEGER NOT NULL DEFAULT 2400 min 0, `max_negative_limit_minutes` INTEGER NOT NULL DEFAULT -600 max 0, `warning_threshold_percentage` INTEGER NOT NULL DEFAULT 80 min 1 max 100, `updated_at` TEXT NOT NULL)
- [X] T004 [P] Implement password hashing and token generation service with Node `crypto.scryptSync` in `server/src/services/auth-service.ts` enforcing pre-hash password validation rules (minimum 8 characters, at least 1 letter and 1 number)
- [X] T005 [P] Implement user repository and session repository in `server/src/repositories/user-repository.ts` and `server/src/repositories/session-repository.ts`
- [X] T006 Implement Fastify authentication preHandler hook for bearer token validation and user session resolution in `server/src/routes/auth-routes.ts`
- [X] T007 [P] Upgrade Dexie client database to v2 with `user_id` indexing in `client/src/services/db.ts` (`overtimeRecords: 'id, user_id, record_date, sync_status, client_updated_at'`, `compensations: 'id, user_id, planned_date, status, sync_status'`, `syncQueue: '++id, user_id, entityType, entityId, enqueuedAt'`, `preferences: 'user_id, theme_mode'`, `activeSession: 'id, user_id'`)
- [X] T008 Implement client authentication service and session state manager in `client/src/services/auth.ts`

**Checkpoint**: Foundation ready - database tables created, auth crypto operational, and client Dexie schema upgraded. User story implementation can now begin.

---

## Phase 3: User Story 1 - User Authentication & Account Access (Priority: P1) 🎯 MVP

**Goal**: Deliver complete user registration, login, session issuance, and user-friendly authentication screen.

**Independent Test**: Register a new user, log in, verify session token is issued, view protected profile, and log out successfully per Scenario 1 in `quickstart.md`.

### Tests for User Story 1

- [X] T009 [P] [US1] Create automated contract & unit tests for registration, login, me, and logout in `server/tests/auth.test.ts` validating responses against `specs/002-auth-multiuser-theme/contracts/auth-api.json`

### Implementation for User Story 1

- [X] T010 [US1] Implement registration, login, me, and logout API endpoints in `server/src/routes/auth-routes.ts` and register in `server/src/index.ts`
- [X] T011 [P] [US1] Create dedicated authentication screen component with Login and Register tabs, form validation, and accessible feedback in `client/src/views/LoginView.vue`
- [X] T012 [US1] Configure Vue Router authentication guard in `client/src/main.ts` redirecting unauthenticated visitors to `/login`
- [X] T013 [US1] Update `client/src/components/layout/AppLayout.vue` to display active user display name / avatar initials and provide logout action

**Checkpoint**: User Story 1 MVP fully operational. Users can register, log in, view personal session profile, and log out.

---

## Phase 4: User Story 2 - Impeccable Design Polish & Adaptive Dark/Light Mode (Priority: P2)

**Goal**: Deliver adaptive Light, Dark, and System Auto theming with Impeccable craft floor, accessible contrast (WCAG AA >= 4.5:1), and smooth transitions without FOUC.

**Independent Test**: Toggle between Light, Dark, and System Auto in Settings; confirm immediate visual theme change with >= 4.5:1 text contrast and zero FOUC on reload per Scenario 3 in `quickstart.md`.

### Tests for User Story 2

- [X] T014 [P] [US2] Create automated contract and theme switching tests in `server/tests/contract/theme-preferences.test.ts` validating `theme_mode` enum `['light', 'dark', 'system']`

### Implementation for User Story 4

- [X] T015 [P] [US2] Implement theme management service in `client/src/services/theme.ts` supporting `light`, `dark`, and `system` modes with `matchMedia` listener and `localStorage` persistence
- [X] T016 [P] [US2] Create ThemeToggle component with touch target >= 44x44px in `client/src/components/layout/ThemeToggle.vue`
- [X] T017 [US2] Implement user preference update endpoint `PUT /api/user/preferences` in `server/src/routes/auth-routes.ts` validating `theme_mode` enum `['light', 'dark', 'system']` and limit constraints
- [X] T018 [US2] Refactor `client/src/components/layout/AppLayout.vue` and primary views to use adaptive light/dark semantic tokens and >= 44x44px touch targets
- [X] T019 [US2] Integrate ThemeToggle and appearance controls into `client/src/views/SettingsView.vue`

**Checkpoint**: Light and Dark modes functional across all views, persisted locally and on server profile with zero FOUC.

---

## Phase 5: User Story 3 - Multi-User Profile Management & Session Isolation (Priority: P3)

**Goal**: Ensure 100% strict data partitioning of overtime records, balances, and compensations by user identity.

**Independent Test**: Create two users; log overtime under User A; switch to User B; verify User B sees zero records and 0h balance per Scenario 2 in `quickstart.md`.

### Tests for User Story 3

- [X] T020 [P] [US3] Create automated integration test verifying strict multi-user record and balance isolation in `server/tests/user-isolation.test.ts`

### Implementation for User Story 3

- [X] T021 [US3] Update `server/src/repositories/records-repository.ts` and `server/src/repositories/compensations-repository.ts` to scope all queries strictly by `user_id`
- [X] T022 [US3] Update route handlers in `server/src/routes/records.ts`, `server/src/routes/compensations.ts`, and `server/src/routes/balance.ts` to enforce `request.userId`
- [X] T023 [US3] Update client balance calculation and records store to filter by active `user_id` in `client/src/services/balance-service.ts`

**Checkpoint**: Multi-user isolation validated. No cross-contamination between different user accounts.

---

## Phase 6: User Story 4 - Offline Session Continuity for Multi-User PWA (Priority: P4)

**Goal**: Ensure active authenticated users can continue recording time offline without session lockout and sync cleanly upon reconnection.

**Independent Test**: Disconnect network while logged in; record an overtime entry; verify entry is stored locally and syncs upon reconnection per Scenario 4 in `quickstart.md`.

### Implementation for User Story 4

- [X] T024 [P] [US4] Update client sync engine in `client/src/services/sync.ts` to attach Bearer Authorization header and `user_id` to sync queue items
- [X] T025 [US4] Implement offline session fallback and network status visual indicator in `client/src/services/auth.ts` and `client/src/components/layout/AppLayout.vue`

**Checkpoint**: Offline PWA operations seamlessly preserve authenticated user entries and sync safely upon reconnection.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, ignore files, build checks, and end-to-end verification

- [X] T026 [P] Verify ignore files (`.gitignore`, `.dockerignore`) for Node.js / Docker patterns and security exclusions
- [X] T027 Run full test suite (`npm run test`) and type check / build verification (`npm run build`)
- [X] T028 Validate end-to-end scenarios per `specs/002-auth-multiuser-theme/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent appearance features, integrates with auth preferences
- **User Story 3 (P3)**: Depends on User Story 1 (requires user accounts to isolate records)
- **User Story 4 (P4)**: Depends on User Story 1 and User Story 3 (requires authenticated user identity and scoped records)

### Within Each User Story

- Tests MUST be written and fail before implementation
- Repositories/services before endpoints/routes
- Backend endpoints before frontend UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: T001 and T002 can run in parallel
- **Phase 2 (Foundational)**: T004, T005, and T007 can run in parallel after T003
- **Phase 3 (User Story 1)**: T009 and T011 can run in parallel
- **Phase 4 (User Story 2)**: T014, T015, and T016 can run in parallel
- **Phase 5 (User Story 3)**: T020 can run in parallel with client prep
- **Phase 7 (Polish)**: T026 can run in parallel with verification tasks

---

## Parallel Example: User Story 1

```bash
# Launch test task and UI component task together:
Task: "T009 [P] [US1] Create automated contract & unit tests for registration, login, me, and logout in server/tests/auth.test.ts"
Task: "T011 [P] [US1] Create dedicated authentication screen component with Login and Register tabs in client/src/views/LoginView.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T008) (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T009 - T013)
4. **STOP and VALIDATE**: Test User Story 1 independently with `quickstart.md` Scenario 1
5. Deploy/demo initial multi-user registration and login MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (P1) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (P2) → Test theming independently → Deploy/Demo
4. Add User Story 3 (P3) → Test isolation independently → Deploy/Demo
5. Add User Story 4 (P4) → Test offline continuity independently → Deploy/Demo
6. Each story delivers isolated value without breaking previous stories

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Auth & Account Access)
   - Developer B: User Story 2 (Impeccable Design & Theming)
3. Once US1 completes:
   - Developer A: User Story 3 (Data Isolation & Tenancy)
   - Developer B: User Story 4 (Offline Continuity & Sync)

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to specific user story for traceability (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Each user story is independently completable and testable
- All tasks strictly adhere to the checklist format `- [ ] [TaskID] [P?] [Story?] Description with file path`
