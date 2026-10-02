# Feature Specification: Overtime Management & Time Bank System

**Feature Branch**: `001-overtime-management`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Registro e gerenciamento de horas extras com interface mobile-first, suporte offline em PWA e sincronização com banco de dados central, O registro de horas sera feito com entrada , saida , devera ter banco de horas positivo / negativo , mecanismo para pre-agendar compensacao, configuracao de limite de banco de horas, notificacoes e emissao de relatorio em xls, csv e pdf"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Offline-First Overtime Entry & Log Viewing (Priority: P1)

As a worker, I want to quickly record my overtime work shift with start and end times directly from my mobile device—even when I do not have an internet connection—so that my extra hours are immediately logged, never lost, and automatically synchronized once I am back online.

**Why this priority**: Capturing time entries is the foundational capability of the product. Without reliable, frictionless, offline-capable entry recording, no time bank calculations or reports can occur.

**Independent Test**: Can be fully tested by turning on airplane mode on a mobile device, recording an overtime entry with entry/exit times, verifying it appears instantly in the daily timeline with an "offline/pending sync" badge, turning off airplane mode, and observing that the status updates to "synchronized" without data loss.

**Acceptance Scenarios**:

1. **Given** the user is viewing the application on a mobile device, **When** they tap to record an overtime entry, specify date, start time, end time, and an optional description, and confirm, **Then** the entry is saved immediately, added to the active records list, and displays duration in hours and minutes.
2. **Given** the device has no network connectivity (offline), **When** the user creates, updates, or deletes an overtime record, **Then** the operation succeeds locally with instant visual feedback, the record is marked as pending synchronization, and the user is not blocked by loading spinners or network errors.
3. **Given** there are pending offline records, **When** internet connectivity is restored, **Then** the application automatically sends queued updates to the central storage, updates sync badges to indicate synced status, and keeps local and central data consistent.
4. **Given** the user views the records list, **When** browsing past dates, **Then** records are grouped by date and month, displaying individual durations and daily total overtime.

---

### User Story 2 - Time Bank Balance & Limit Configuration (Priority: P2)

As a worker, I want to view my accumulated time bank balance (both positive overtime and negative deficits) and configure maximum safe limits so that I stay informed of my accrued hours and avoid exceeding company or personal policies.

**Why this priority**: Tracking positive and negative balance against policy limits is the primary analytical value of the application, transforming raw time logs into actionable time bank visibility.

**Independent Test**: Can be fully tested by configuring a positive limit (e.g., +40 hours) and negative limit (e.g., -10 hours), submitting records that approach or cross these limits, and verifying that the dashboard prominently updates the net balance with color-coded alerts and warnings.

**Acceptance Scenarios**:

1. **Given** multiple recorded overtime shifts and deficit entries, **When** the user accesses the dashboard, **Then** they see the overall net balance, total positive hours accumulated, and total negative hours deducted for the selected period.
2. **Given** the user accesses time bank settings, **When** they define a maximum positive balance limit and a maximum negative balance limit, **Then** the system validates that positive limits are greater than zero and negative limits are less than zero, and stores these thresholds.
3. **Given** configured limits, **When** the user's balance reaches or exceeds 80% of a configured threshold, **Then** the interface displays an informational warning banner indicating proximity to the threshold.
4. **Given** configured limits, **When** the user's balance exceeds 100% of a configured threshold, **Then** the interface displays a high-priority critical warning banner indicating that the limit has been surpassed.

---

### User Story 3 - Pre-Scheduling Compensation (Priority: P3)

As a worker with accumulated positive overtime, I want to pre-schedule future days or hours to take off (or work reduced shifts) as compensation so that I can plan my time off in advance and project my resulting time bank balance.

**Why this priority**: Compensation scheduling closes the loop of time bank management by enabling scheduled deductions rather than only tracking accumulated overtime.

**Independent Test**: Can be fully tested by selecting an upcoming date, scheduling 4 hours of compensation time off, and verifying that the system registers the scheduled compensation, displays it in an upcoming schedule calendar/list, and displays projected balance after compensation.

**Acceptance Scenarios**:

1. **Given** an existing positive balance, **When** the user creates a pre-scheduled compensation specifying date, planned duration (or start/end time), and reason, **Then** the compensation is saved with status "Scheduled" and appears in the compensation agenda.
2. **Given** scheduled compensations, **When** the user views the time bank summary, **Then** the system presents both current realized balance and projected balance (current balance minus pending scheduled compensations).
3. **Given** an existing scheduled compensation, **When** the date of the compensation arrives or passes, **Then** the user can confirm completion, mark as cancelled, or edit the actual hours taken.
4. **Given** a scheduled compensation that exceeds the current positive time balance, **When** the user attempts to schedule it, **Then** the system warns that the schedule will lead to a negative balance but allows confirmation if negative balances are permitted by configuration.

---

### User Story 4 - Multi-Format Report Export (Priority: P4)

As a worker, I want to generate and export comprehensive time bank and overtime reports in PDF, CSV, and XLS formats for any custom date range so that I can submit official statements to HR, payroll, or keep personal offline archives.

**Why this priority**: Exporting data in standard business formats ensures portability, auditing compliance, and seamless sharing with employers or accounting.

**Independent Test**: Can be fully tested by selecting a date range (e.g., current month), clicking export for each format (PDF, CSV, XLS), and verifying that all files download successfully with correct entry rows, summaries, totals, and timestamps.

**Acceptance Scenarios**:

1. **Given** existing time entries and compensations within a date range, **When** the user requests a CSV export, **Then** a structured CSV file downloads containing columns: Date, Start Time, End Time, Break Duration, Net Overtime Hours, Type, Compensation Notes, and Status.
2. **Given** existing records within a date range, **When** the user requests an XLS (spreadsheet) export, **Then** an Excel-compatible spreadsheet downloads containing formatted tables, headers, and formula-compatible numeric values for durations.
3. **Given** existing records within a date range, **When** the user requests a PDF export, **Then** a print-ready, clean document downloads containing a formatted summary header (period, worker details, total positive hours, total negative hours, final net balance) followed by an itemized chronological table.
4. **Given** a date range with zero records, **When** an export is initiated, **Then** the system notifies the user that no records exist in the specified period before attempting generation.

---

### User Story 5 - Mobile PWA Installation & Proactive Notifications (Priority: P5)

As a mobile user on Android or iOS, I want to install the application as a home screen app and receive timely notifications so that I get alerts about exceeded time bank limits, scheduled compensations, and daily shift recording reminders.

**Why this priority**: Enhances engagement, native app feel, and proactive risk mitigation without requiring App Store or Google Play packaging.

**Independent Test**: Can be fully tested by accessing the web application on a mobile browser, verifying the install prompt/guidance, installing to the home screen, opening in standalone mode without browser chrome, and receiving scheduled notification alerts for upcoming compensations and balance warnings.

**Acceptance Scenarios**:

1. **Given** a user visiting the application on a compatible mobile browser, **When** prompt conditions are met, **Then** the user is prompted with an install option (or guided instructions on iOS Safari) to add the app to the home screen.
2. **Given** the app is installed, **When** opened from the home screen icon, **Then** it launches in standalone display mode with dedicated app styling, splash screen, and responsive bottom-bar navigation.
3. **Given** notifications are enabled in settings, **When** a time bank balance crosses a configured warning or maximum threshold, **Then** the system generates a notification alerting the user of the status.
4. **Given** a pre-scheduled compensation is planned for tomorrow, **When** notification triggers run, **Then** the user receives a reminder of the upcoming compensation hours.

---

### Edge Cases

- **Shift Crossing Midnight**: When an overtime shift begins on one day (e.g., 22:00) and ends on the next calendar day (e.g., 03:00), the system must compute duration as 5 hours and attribute the shift deterministically to the starting calendar date while noting overnight duration.
- **Overlapping Time Entries**: When a user inputs an overtime entry whose start and end times overlap an existing recorded shift, the system must prompt the user to resolve or confirm the conflicting interval.
- **Concurrent Offline Modifications**: When an entry is edited offline on one client and also modified centrally, conflict resolution must favor the most recently updated timestamp while preserving an audit trace.
- **Zero or Negative Durations**: If end time equals start time or is entered backwards without crossing midnight, the system must reject submission with clear validation guidance.
- **Large Historical Export**: When generating PDF or spreadsheet exports for multi-year periods, the generation process must stream or chunk generation to prevent client interface freeze or mobile browser memory limits.
- **Offline Report Request**: When offline, report generation must offer an export based on locally cached records with a prominent watermark or footnote indicating "Generated from local offline cache".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to record overtime entries containing date, start time, end time, optional break deduction duration, and optional description/category.
- **FR-002**: System MUST validate all time intervals to ensure start and end times produce positive non-zero durations, automatically handling shifts that cross midnight.
- **FR-003**: System MUST support editing and deleting existing overtime records with confirmation safeguards.
- **FR-004**: System MUST store overtime records in local client storage immediately upon input, allowing complete record creation, editing, and timeline browsing while disconnected from the internet.
- **FR-005**: System MUST automatically synchronize queued offline operations with the central database when network connectivity is established or restored.
- **FR-006**: System MUST clearly display sync status for every record (e.g., "Synchronized", "Pending Sync", "Sync Error").
- **FR-007**: System MUST calculate and maintain the cumulative time bank balance, computing both positive overtime accrued and negative deductions/deficits.
- **FR-008**: System MUST allow users to configure time bank limits, including a maximum allowed positive balance (surplus limit) and a maximum allowed negative balance (deficit limit).
- **FR-009**: System MUST display visual alert indicators on the dashboard when the current balance reaches configurable warning thresholds (e.g., 80% and 100% of limits).
- **FR-010**: System MUST allow users to pre-schedule compensation events, specifying future date, scheduled hours to compensate, and optional notes.
- **FR-011**: System MUST compute and present a projected time bank balance that accounts for pending pre-scheduled compensations.
- **FR-012**: System MUST allow users to update scheduled compensation events (mark as completed, adjust actual hours taken, or cancel).
- **FR-013**: System MUST provide proactive notifications for balance limit threshold events, upcoming pre-scheduled compensations, and daily entry reminders according to user preferences.
- **FR-014**: System MUST allow users to configure notification preferences (enable/disable specific alert types, preferred reminder time).
- **FR-015**: System MUST generate exportable reports for any user-selected date range in CSV format, including itemized records, break deductions, and net hours.
- **FR-016**: System MUST generate exportable reports for any user-selected date range in XLS (spreadsheet) format with formatted tables, column headers, and calculated totals.
- **FR-017**: System MUST generate exportable reports for any user-selected date range in PDF format with print-friendly layout, summary totals (accumulated overtime, compensations, net balance), and chronological record listings.
- **FR-018**: System MUST implement responsive mobile-first layouts with touch-friendly controls (minimum 44x44px interactive areas) and bottom navigation patterns for one-handed operation.
- **FR-019**: System MUST support installation as a Progressive Web App (PWA) on Android and iOS devices, complying with standard web app manifest and service worker requirements.
- **FR-020**: System MUST maintain data consistency and prevent duplicate record creation during network reconnections and synchronization retries.

### Key Entities

- **OvertimeRecord**: Represents an individual logged overtime shift.
  - Attributes: identifier, date, start_time, end_time, break_duration_minutes, net_minutes, description, category, sync_status, created_at, updated_at.
- **TimeBankBalance**: Represents the running aggregate balance for a user.
  - Attributes: total_positive_minutes, total_negative_minutes, net_balance_minutes, projected_balance_minutes, last_calculated_at.
- **CompensationSchedule**: Represents a pre-planned or completed compensation time off.
  - Attributes: identifier, planned_date, scheduled_minutes, actual_minutes, status (Scheduled, Completed, Cancelled), notes, created_at, updated_at.
- **TimeBankSettings**: Represents user-specific policy configurations.
  - Attributes: max_positive_limit_hours, max_negative_limit_hours, warning_threshold_percentage, notifications_enabled, reminder_time_preferences.
- **NotificationEvent**: Represents a generated alert or reminder.
  - Attributes: identifier, type (LimitWarning, LimitExceeded, CompensationReminder, DailyLogReminder), message, scheduled_for, triggered_at, read_status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete and save a new overtime entry in under 15 seconds on a mobile device.
- **SC-002**: 100% of overtime entries recorded while offline are persisted locally and synchronized without data loss upon network reconnection.
- **SC-003**: Time bank balance and projected balance updates reflect on the screen in less than 1 second following any record creation, modification, or compensation scheduling.
- **SC-004**: Multi-format report generation (PDF, CSV, XLS) for up to 12 months of historical data completes and initiates download in under 3 seconds.
- **SC-005**: 100% of balance limit warnings trigger accurately when a user's balance reaches or crosses configured threshold values.
- **SC-006**: First contentful paint of the mobile PWA occurs in under 1.5 seconds on repeat visits using cached application shell assets.
- **SC-007**: 95% of first-time users can successfully log their first overtime entry without requiring external documentation or help tutorials.

## Assumptions

- **Target Persona & Context**: Primarily intended for employees, contractors, and field workers who track personal overtime and manage hours compensation on personal mobile smartphones.
- **User Scope**: Designed initially for single-user profile usage per installation/session, while structuring entities with user identity foreign keys to support multi-tenant backends without architectural rework.
- **Standard Baseline Shift**: The entry specifically records extra time (overtime shifts), or the net excess beyond standard shift duration. Users enter either explicit overtime start/end hours directly or standard interval logs.
- **Notification Mechanism**: Utilizes standard Web Notifications / PWA Push Notification capabilities supported by modern mobile browsers (Android Chrome and iOS Safari 16.4+). In-app visual notifications serve as a guaranteed fallback.
- **Report Generation Strategy**: Lightweight client-side or server-assisted streaming produces standard CSV, formatted XLS, and printable PDF documents compatible with common office suites and PDF viewers.
- **Deployment Alignment**: Operates seamlessly within single-node containerized environments (Docker Compose on Raspberry Pi) adhering strictly to the Minhas Horas Constitution.
