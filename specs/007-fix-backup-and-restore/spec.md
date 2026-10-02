# Feature Specification: Fix On-Demand Backup and Add Database Restore

**Feature Branch**: `007-fix-backup-and-restore`

**Created**: 2026-10-02

**Status**: Ready

**Input**: User description: "o botao de fazer backup sob demanda esta falhando , body connot empty , coloque a lista de backups tb realiados e um boatao de restore caso necessario"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable On-Demand Manual Backup Execution (Priority: P1)

As an administrator or user managing work records, I want to trigger an immediate manual backup with a single click and have it succeed reliably without payload negotiation errors (such as "body cannot be empty"), so that I can guarantee my current data is safely persisted before making major updates.

**Why this priority**: Manual backup is the frontline safeguard against data loss. When the user explicitly requests an ad-hoc backup, any failure prevents confident operation and leaves data at risk.

**Independent Test**: Can be fully tested by clicking the "Fazer Backup Agora" button on the Settings screen. The process must transition to an in-progress state, finish without empty body errors, display a confirmation toast/banner with the generated filename, and make the backup immediately available.

**Acceptance Scenarios**:

1. **Given** a user on the Settings screen, **When** they click "Fazer Backup Agora", **Then** the request is accepted by the server without empty body errors, an in-progress indicator is shown, and a success message confirms the backup generation with file details.
2. **Given** a manual backup is already executing, **When** the user attempts to trigger another backup, **Then** the action is prevented with a clear advisory message indicating a process is already running.

---

### User Story 2 - Comprehensive Backup History and Audit List (Priority: P2)

As a user responsible for data preservation, I want to view a clear, chronological list of all executed backups (both manual and automated) directly on the Settings screen, including date, time, status, size, and source, so that I have complete visibility into what points in time are preserved and can easily download any archive.

**Why this priority**: Visibility into past backups gives users confidence that scheduled and manual routines are genuinely functioning, and allows them to choose the right point in time for audit, external archiving, or recovery.

**Independent Test**: Can be tested by triggering a backup or loading the Settings screen with existing backups. The history table must render all historical runs with proper formatting (date, size in human-readable units, trigger type, and execution outcome), and allow immediate downloading of completed archives.

**Acceptance Scenarios**:

1. **Given** one or more completed backups exist in the system, **When** the user opens the Settings screen, **Then** all backup runs are displayed in chronological order with date, trigger type (Manual or Automatic), file size, records count, and status badge.
2. **Given** a new manual backup completes successfully, **When** the operation finishes, **Then** the backup history list automatically updates to show the newest entry at the top without requiring a manual page refresh.
3. **Given** an entry in the backup history with status "completed", **When** the user clicks "Baixar", **Then** the browser downloads the archive file with its integrity metadata.

---

### User Story 3 - Safe and Verified Database Restore (Priority: P3)

As a system owner facing accidental data deletion or corruption, I want to restore the system database from an existing completed backup directly from the backup list, with an explicit confirmation dialog and an automated safety snapshot, so that I can safely recover previous data states without risking irreversible data loss.

**Why this priority**: Backups are incomplete without a tested, safe restore capability. If data is corrupted or accidentally deleted, users need an accessible way to roll back to a known healthy state.

**Independent Test**: Can be tested by selecting an existing backup run, clicking "Restaurar", confirming the destructive action in the modal dialog, and verifying that the database data reverts to the exact state of that backup while an automatic pre-restore safety snapshot is created beforehand.

**Acceptance Scenarios**:

1. **Given** a completed backup in the history list, **When** the user clicks "Restaurar", **Then** a safety confirmation modal appears detailing the backup date, record count, and an explicit warning that current records will be replaced.
2. **Given** the user confirms the restore in the modal, **When** the restore initiates, **Then** the system automatically creates a pre-restore safety snapshot of the active database before applying changes.
3. **Given** a valid backup archive, **When** the restore completes successfully, **Then** the system refreshes active data state, presents a success notification, and records the restore event in the audit log.
4. **Given** a corrupted, unreadable, or missing backup archive, **When** a restore is attempted, **Then** the system aborts the operation, leaves the current database completely intact, and displays a descriptive error message.

---

### Edge Cases

- **Concurrent Backup/Restore**: If a restore or backup is already in progress, any subsequent trigger of backup or restore must be rejected with an informative conflict message ("Operação já em andamento").
- **Missing or Purged Backup File**: If a user attempts to restore or download a backup whose physical file was removed by retention policy or external file cleanup, the system must display an explicit warning ("Arquivo não encontrado ou expurgado").
- **Corrupt Backup Integrity Check**: If a backup file has an invalid checksum or fails database integrity checks prior to restore, the restore must abort immediately without touching the active database.
- **Unsynchronized Offline Client Data**: If a client device has local offline records pending synchronization, the restore confirmation dialog must warn the user that unsynced local drafts may be overwritten or conflicting upon database restoration.
- **Network or Process Interruption During Restore**: If connection drops while restoring, the server-side operation must either atomically complete or rollback to the pre-restore state, never leaving the database in a half-written condition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept manual on-demand backup requests without requiring a request body payload, eliminating any 400 Bad Request / empty body errors.
- **FR-002**: System MUST trigger manual backup operations asynchronously or via immediate execution, returning the initiated run status to the client.
- **FR-003**: System MUST display a dedicated, accessible list of all recorded backup runs on the Settings screen, showing timestamp, trigger origin (Manual vs Scheduled), file size, record count, and operational status (Success, In Progress, Failed, Purged).
- **FR-004**: System MUST automatically refresh the backup history list and current backup status upon the completion of any manual backup execution.
- **FR-005**: System MUST provide an interactive "Baixar" (Download) action for every completed backup run whose physical file remains accessible.
- **FR-006**: System MUST provide an interactive "Restaurar" (Restore) action for every completed backup run whose physical file remains accessible.
- **FR-007**: System MUST require explicit user confirmation via a modal dialog before executing any database restore, stating the backup timestamp, records count, and a warning that subsequent records will be replaced.
- **FR-008**: System MUST automatically generate a safety snapshot of the active database immediately before executing any restore operation, preserving the current state under a traceable pre-restore label.
- **FR-009**: System MUST verify the integrity of the target backup archive before applying it to the active database.
- **FR-010**: System MUST reject restore operations atomically if the target archive is missing, corrupted, or incompatible, leaving the current active database completely unaltered.
- **FR-011**: System MUST notify the user interface with clear success or error feedback when a restore operation completes, prompting a data refresh of the application state.
- **FR-012**: System MUST enforce that all interactive buttons (Backup, Download, Restore, Confirmation) have a minimum touch target size of 44x44px conforming to mobile-first usability standards.

### Key Entities

- **Backup Run**: Represents a recorded execution of a backup operation. Attributes include identifier, timestamp, trigger origin (manual or scheduled), file name, file size in bytes, checksum hash, total records preserved, error message (if failed), and execution status (pending, in progress, completed, failed, purged).
- **Restore Operation**: Represents an administrative event that reverts system data to a previous backup snapshot. Attributes include target backup run reference, pre-restore snapshot reference, timestamp, operator or trigger source, and completion status.
- **Backup Schedule**: Configuration defining the automation frequency, preferred execution time, and retention limit for historical backups.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid manual backup requests succeed on first click without returning 400 Bad Request or empty body errors.
- **SC-002**: Users can initiate an on-demand backup and see visual confirmation with the generated file in under 5 seconds for databases with up to 100,000 records.
- **SC-003**: The backup history list updates automatically within 1 second of backup completion, displaying accurate size, date, and status.
- **SC-004**: Database restore operations complete in under 10 seconds for standard installations, with zero silent data corruption or loss of pre-restore fallback snapshots.
- **SC-005**: 100% of restore operations require explicit user confirmation through a modal dialog, preventing accidental one-click data overwrites.
- **SC-006**: All interactive buttons in the backup and restore management interface strictly comply with the 44x44px touch target accessibility standard.

## Assumptions

- **Target Audience**: Self-hosted administrators or single-user mobile workers managing their own Minhas Horas instance.
- **Data Scope**: The restore operation applies to the entire persistent relational database (users, overtime records, categories, audit logs, and backup schedules).
- **Pre-Restore Rollback**: Creating a pre-restore backup uses negligible additional storage on typical single-node deployments and provides fail-safe rollback capability if a user restores by mistake.
- **Client Synchronization Warning**: The application clearly warns users that restoring a backup replaces server-side records; any local offline drafts created after that backup point may need re-synchronization or manual reconciliation.
- **File Availability**: If a backup file has been deleted from disk by retention policy or system administrator, the UI disables or hides the Restore and Download actions for that entry while retaining the audit record.
