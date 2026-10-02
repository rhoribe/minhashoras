# Feature Specification: Report Consistency and Backup Authentication

**Feature Branch**: `012-report-consistency-and-backup-auth`

**Created**: 2026-10-02

**Status**: Ready for Planning

**Input**: User description: "o relatorio nao esta consistente , tambem quando tento fazer um bacup sob demanda esta dando erro de token"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent and User-Isolated Overtime Reports (Priority: P1)

As an authenticated user (employee or administrator), I want to view accurate previews and export overtime reports (in PDF, Excel, or CSV formats) for any selected period, so that the report reflects precisely my own hours without discrepancy between the preview screen and the exported file, and without including data from any other users.

**Why this priority**: Generating accurate timesheet reports is a primary business value of the application. Inconsistencies between preview and export or showing incorrect data undermines trust and creates compliance and payroll calculation issues.

**Independent Test**: Can be tested independently by logging in as a user with existing overtime records, opening the Reports section, verifying the summary numbers on screen match the recorded logs, and exporting in all available formats to confirm the exported documents contain identical figures and only records belonging to that user.

**Acceptance Scenarios**:

1. **Given** an authenticated user with recorded overtime entries across a month, **When** they access the Reports screen and select that month's date range, **Then** the on-screen preview displays the exact summary totals (total hours, approved hours, pending hours) and detailed list of records belonging exclusively to that user.
2. **Given** an authenticated user viewing an on-screen report preview, **When** they trigger an export to PDF, Excel, or CSV, **Then** the downloaded document contains the exact same records and computed totals shown in the preview, scoped strictly to their account.
3. **Given** two distinct users (User A and User B) with different overtime records, **When** User A exports a report, **Then** no records, summaries, or metadata from User B are included in User A's export or preview.
4. **Given** an authenticated user who is temporarily disconnected from the internet, **When** they generate a report preview or export locally, **Then** the report is generated using locally stored data scoped strictly to that authenticated user session without mixing with any previous user's local entries.

---

### User Story 2 - Authenticated On-Demand and Scheduled System Backups (Priority: P2)

As a system administrator, I want to trigger an on-demand system backup ("Fazer Backup Agora") or update the automatic backup schedule from the Admin panel without encountering authentication token errors, so that I can reliably safeguard application data at any time.

**Why this priority**: System backups are essential for business continuity and disaster recovery. Administrators must be able to create immediate manual snapshots without unhandled authentication failures or rejected sessions.

**Independent Test**: Can be tested independently by logging in as an administrator, navigating to the Backup & Recovery section, clicking "Fazer Backup Agora", and confirming that the backup completes successfully, updates the backup history list, and offers a valid downloadable archive without any authentication token error dialogs.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator on the Admin Backup page, **When** they click "Fazer Backup Agora", **Then** the system validates their active administrative session, creates the backup snapshot, and displays a success notification with the new backup entry in the history list.
2. **Given** an authenticated administrator, **When** they download an existing backup file or adjust the backup schedule frequency, **Then** the action executes successfully within their active administrative session without prompting with authentication errors.
3. **Given** a standard (non-admin) authenticated user, **When** they attempt to trigger or access system-wide backups, **Then** access is denied and they are restricted only to their personal data export controls.
4. **Given** an administrator whose login session has expired, **When** they attempt to run a backup, **Then** the system presents a clear session expiration message prompting them to sign in again rather than failing with an unhandled or raw technical token error.

---

### Edge Cases

- **Zero records in selected period**: When a user generates a report for a date interval with no records, the preview and export must cleanly state that zero hours were found rather than throwing an error or showing residual data from previous queries.
- **Session expiration during report export or backup**: If the user's or administrator's session expires while they are on the page and they click export or backup, the application must notify them that their session has expired and provide a seamless way to re-authenticate without losing page context.
- **Rapid successive backup triggers**: If an administrator clicks "Fazer Backup Agora" multiple times in rapid succession, the application must disable the trigger button while a backup is in progress to prevent redundant concurrent snapshots.
- **Switching user accounts on the same device**: When User A logs out and User B logs in on the same browser/device, User B's report preview must immediately clear User A's preview and display only User B's records.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scope all report generation (both preview summaries and downloadable export files) exclusively to the currently authenticated user.
- **FR-002**: The system MUST guarantee 100% parity between the metrics/records presented in the on-screen report preview and the data generated in PDF, Excel, and CSV export files.
- **FR-003**: The system MUST refresh and synchronize the user's latest overtime records when loading or updating the report preview to prevent displaying stale or unaligned local data.
- **FR-004**: In offline mode, the system MUST filter local offline storage strictly by the active user's identity when generating offline reports.
- **FR-005**: The system MUST automatically attach and validate active user credentials for all administrative backup operations (on-demand backup creation, schedule updates, history viewing, and file downloads).
- **FR-006**: The system MUST provide immediate, clear feedback (progress indicator and success notification) when an administrator triggers an on-demand backup.
- **FR-007**: The system MUST prevent simultaneous duplicate backup executions by disabling the action trigger while a backup operation is active.
- **FR-008**: The system MUST display user-friendly error messages when a session is invalid or expired, clearly directing the user to sign in again rather than displaying raw technical error messages.

### Key Entities *(include if feature involves data)*

- **Overtime Report**: A structured aggregation of overtime records within a specified start and end date, belonging to a single user, comprising summary statistics (total hours, approved hours, pending hours) and itemized entry logs.
- **System Backup Snapshot**: An administrative archive containing the complete system state and database snapshot, accompanied by metadata (creation timestamp, archive size, SHA256 checksum, triggering administrator).
- **User Session**: An active authenticated state identifying the user and their role (standard user or administrator), required to authorize reports and administrative operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of generated report previews and exported documents (PDF, Excel, CSV) accurately match the user's recorded overtime data with zero cross-user data leakage.
- **SC-002**: On-demand backup execution ("Fazer Backup Agora") by an authenticated administrator succeeds on the first attempt with 0% authentication token failures.
- **SC-003**: Report previews load and display current, synchronized data within 2 seconds under standard network conditions.
- **SC-004**: 100% of session expiration events during report export or backup operations produce an informative prompt instructing the user to re-authenticate, eliminating ambiguous error messages.

## Assumptions

- Users accessing the Reports view have already authenticated and hold an active session token.
- Administrators triggering system backups are assigned the administrative role and hold an active session token.
- Existing report export formats (PDF, Excel, CSV) and visual preview layouts remain functionally identical; this feature ensures data accuracy, consistency, and authorized transport.
- The single-node SQLite database and local client storage remain the foundational storage layers.
