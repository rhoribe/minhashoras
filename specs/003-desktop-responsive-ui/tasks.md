# Tasks: Desktop Responsive UI & Layout Craft

**Input**: Design documents from `/specs/003-desktop-responsive-ui/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks are included per acceptance scenarios and verification requirements defined in [spec.md](./spec.md) and [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend client**: `client/src/`, `client/`
- **Tests**: `tests/client/`, `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Responsive utilities, Tailwind configuration, and viewport state composable

- [X] T001 [P] Configure responsive container and layout utilities in `client/tailwind.config.js` per `specs/003-desktop-responsive-ui/contracts/layout-contract.json`
- [X] T002 [P] Create reactive viewport breakpoint composable `useBreakpoint` in `client/src/composables/useBreakpoint.ts` supporting thresholds (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core desktop layout navigation and automated responsive testing infrastructure

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create desktop sidebar navigation component in `client/src/components/layout/DesktopSidebar.vue` with brand logo, nav links (Painel, Registros, Compensar, Relatórios, Ajustes), active route indicator, user profile badge, and ThemeToggle with minWidth '256px' ('w-64')
- [X] T004 [P] Create automated responsive layout unit tests in `tests/client/responsive-layout.test.ts` testing `useBreakpoint` composable and layout visibility thresholds

**Checkpoint**: Foundation ready - desktop sidebar component built, viewport composable active, and test harness in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Adaptive App Shell & Desktop Navigation (Priority: P1) 🎯 MVP

**Goal**: Deliver adaptive shell scaling up to `max-w-7xl` on desktop with persistent left sidebar, while preserving mobile bottom bar and touch targets on mobile viewports (< 768px).

**Independent Test**: Verify desktop layout shows left sidebar and expanded content area on viewports $\ge 1024\text{px}$, and mobile viewports (< 768px) display bottom navigation bar with $\ge 44\times 44\text{px}$ touch targets per Scenario 1 & 2 in `quickstart.md`.

### Implementation for User Story 1

- [X] T005 [US1] Refactor `client/src/components/layout/AppLayout.vue` to integrate DesktopSidebar on viewports >= 1024px ('hidden lg:flex w-64') and expand main container to 'w-full max-w-7xl mx-auto' while hiding bottom bar on desktop ('lg:hidden')
- [X] T006 [P] [US1] Refactor `client/src/views/LoginView.vue` to render an elegantly centered card on desktop screens ('max-w-md mx-auto') with backdrop elevation and balanced padding

**Checkpoint**: User Story 1 MVP fully operational. Application expands on desktop monitors with persistent sidebar navigation and preserves phone ergonomics.

---

## Phase 4: User Story 2 - Multi-Column Desktop Dashboard & Analytics (Priority: P2)

**Goal**: Deliver a responsive 12-column grid layout for the dashboard on desktop screens.

**Independent Test**: On desktop viewport ($\ge 1024\text{px}$), verify balance summary, limit alerts, and quick actions sit alongside recent overtime activities without vertical scrolling per Scenario 3 in `quickstart.md`.

### Implementation for User Story 2

- [X] T007 [P] [US2] Update `client/src/components/balance/BalanceCard.vue` to support expanded horizontal metrics layout on viewports >= 1024px
- [X] T008 [US2] Refactor `client/src/views/DashboardView.vue` into an asymmetric 12-column grid layout ('grid grid-cols-1 lg:grid-cols-12 gap-6') placing BalanceCard and Quick Actions in col-span-7 and Recent Entries in col-span-5 on desktop

**Checkpoint**: Dashboard view utilizes desktop screen width effectively with side-by-side operational and history panels.

---

## Phase 5: User Story 3 - Responsive Tables & Expanded Views for Records & Reports (Priority: P3)

**Goal**: Structured data tables for overtime records and side-by-side layout for reports on desktop.

**Independent Test**: On viewports $\ge 768\text{px}$, verify Records displays full tabular columns (Data, Horário, Intervalo, Total Líquido, Categoria, Status, Ações) with inline action buttons, and Reports displays export options side-by-side with table preview per Scenario 4 in `quickstart.md`.

### Implementation for User Story 3

- [X] T009 [P] [US3] Refactor `client/src/components/records/RecordList.vue` to render an accessible responsive data table on viewports >= 768px ('hidden md:table w-full') with inline edit/delete actions, while preserving touch cards on mobile ('md:hidden')
- [X] T010 [US3] Update `client/src/views/RecordsView.vue` with desktop horizontal filter toolbar and table integration
- [X] T011 [P] [US3] Refactor `client/src/views/ReportsView.vue` to display export configuration controls and generated report preview in a responsive two-column grid on desktop screens ('grid grid-cols-1 lg:grid-cols-12 gap-6')
- [X] T012 [P] [US3] Refactor `client/src/views/CompensationsView.vue` into a responsive two-column grid on viewports >= 1024px displaying scheduled compensations alongside summary statistics

**Checkpoint**: Records, Reports, and Compensations screens display comprehensive tabular layouts on desktop monitors.

---

## Phase 6: User Story 4 - Desktop Modals, Forms & Settings Layout (Priority: P4)

**Goal**: Centered dialog modals with keyboard `Escape` dismissal, focus handling, and two-column Settings view.

**Independent Test**: Trigger "Novo Registro" on desktop, verify centered dialog, press `Escape` to close; verify Settings renders in two columns per Scenario 4 in `quickstart.md`.

### Implementation for User Story 4

- [X] T013 [P] [US4] Refactor `client/src/components/records/OvertimeFormModal.vue` to render as a centered dialog on desktop viewports ('sm:max-w-lg sm:rounded-2xl sm:my-auto') with backdrop blur and native Escape key dismissal listener
- [X] T014 [US4] Refactor `client/src/views/SettingsView.vue` into a responsive two-column layout on viewports >= 1024px ('grid grid-cols-1 lg:grid-cols-2 gap-6') grouping User Profile & Limits on left and Appearance & Notifications on right

**Checkpoint**: Dialog modals and settings are proportioned and keyboard-navigable on desktop displays.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, touch ergonomics audits, test suite validation, and end-to-end verification

- [X] T015 [P] Audit all interactive buttons and navigation links across desktop and mobile to verify compliance with minimum touch target size ('min-h-touch min-w-touch' >= 44x44px)
- [X] T016 Run full test suite (`npm run test`) and type check / build verification (`npm run build`)
- [X] T017 Validate end-to-end scenarios per `specs/003-desktop-responsive-ui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start immediately after Foundational
  - User Story 2 (P2): Depends on User Story 1 shell expansion
  - User Story 3 (P3): Depends on User Story 1 shell expansion
  - User Story 4 (P4): Depends on User Story 1 shell expansion
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- **Phase 1 (Setup)**: T001 and T002 can run in parallel
- **Phase 2 (Foundational)**: T004 can run in parallel with T003
- **Phase 3 (User Story 1)**: T006 can run in parallel with T005
- **Phase 4 (User Story 2)**: T007 can run in parallel with T008 prep
- **Phase 5 (User Story 3)**: T009, T011, and T012 can run in parallel
- **Phase 6 (User Story 4)**: T013 can run in parallel with T014
- **Phase 7 (Polish)**: T015 can run in parallel with verification tasks

---

## Parallel Example: User Story 3

```bash
# Launch table component and view refactoring concurrently:
Task: "T009 [P] [US3] Refactor client/src/components/records/RecordList.vue to render an accessible responsive data table on viewports >= 768px"
Task: "T011 [P] [US3] Refactor client/src/views/ReportsView.vue to display export configuration controls and generated report preview in a responsive two-column grid on desktop screens"
Task: "T012 [P] [US3] Refactor client/src/views/CompensationsView.vue into a responsive two-column grid on viewports >= 1024px"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T002)
2. Complete Phase 2: Foundational (T003 - T004) (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T005 - T006)
4. **STOP and VALIDATE**: Test User Story 1 independently with `quickstart.md` Scenario 1 & 2
5. Deploy/demo desktop app shell and persistent sidebar navigation MVP

### Incremental Delivery

1. Complete Setup + Foundational → Desktop foundation ready
2. Add User Story 1 (P1) → Test shell independently → Deploy/Demo (MVP!)
3. Add User Story 2 (P2) → Test multi-column dashboard independently → Deploy/Demo
4. Add User Story 3 (P3) → Test responsive data tables independently → Deploy/Demo
5. Add User Story 4 (P4) → Test centered dialogs & keyboard shortcuts independently → Deploy/Demo
6. Each story delivers isolated value without breaking previous stories

---

## Notes

- `[P]` tasks = different files, no dependencies
- `[Story]` label maps task to specific user story for traceability (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Each user story is independently completable and testable
- All tasks strictly adhere to the checklist format `- [ ] [TaskID] [P?] [Story?] Description with file path`
