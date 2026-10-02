# Feature Specification: Database Factory Reset and System Purge

**Feature Branch**: `009-database-factory-reset`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "crie um botao para apagar todos os dados da base , como se fosse zerar tudo para comecar do inicio"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Database Reset to Fresh Baseline (Priority: P1)

An administrator wants to start over from scratch, wiping all operational history, overtime records, timebank adjustments, compensation schedules, and user-generated data so the application behaves as if it were newly deployed. The administrator navigates to the administrative management area, clicks the system reset option, and is presented with a high-visibility warning dialog. The administrator confirms intent by typing the required confirmation word. Upon confirmation, the system purges all business records, removes all non-essential accounts, resets or ensures a baseline administrative account is available, invalidates all sessions, and clears the local application cache, returning the administrator to the initial login screen with an empty database.

**Why this priority**: Core value of the user request. Allows a clean slate for testing, reconfiguration, or fresh organizational start without needing to access the server host command line or rebuild container volumes.

**Independent Test**: An administrator with accumulated overtime entries and users triggers the reset with the correct confirmation phrase; the system empties all records, preserves a default admin account, and allows logging into a completely empty dashboard with zero records and zero balance.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator viewing the system administration area, **When** they initiate a factory reset and correctly submit the required confirmation phrase, **Then** all overtime records, compensation schedules, and audit entries are permanently deleted, active sessions are revoked, and the user is redirected to the initial login screen.
2. **Given** a reset confirmation dialog, **When** the administrator enters an incorrect confirmation phrase or cancels the dialog, **Then** no records are deleted and the system remains in its existing state.
3. **Given** a non-administrator user, **When** they attempt to access or trigger the factory reset function, **Then** the request is rejected with an authorization denial.

---

### User Story 2 - Backup Archives Deletion (Priority: P2)

When performing a system reset, the administrator wants to eliminate all previous system backup files stored on the server so that old data cannot be inadvertently restored or consume unnecessary storage. The reset operation includes the option (active by default) to purge all server-side backup archives alongside the database records.

**Why this priority**: Ensures a truly comprehensive purge without leaving stale backup snapshots taking up server storage or risking accidental restoration of obsolete data.

**Independent Test**: Create multiple manual backups, execute the reset with backup purge enabled, and verify that the backup directory and backup list are completely empty.

**Acceptance Scenarios**:

1. **Given** existing stored backup archive files on the system, **When** the administrator executes the factory reset with backup purge enabled, **Then** all stored backup files are permanently removed from the system.
2. **Given** a factory reset executed with backup purge disabled, **When** the reset completes, **Then** database records are wiped but previous backup archives remain intact for future restoration.

---

### User Story 3 - Client Cache Purge and Reconnection Protection (Priority: P3)

When a system reset occurs, any device running the client application (whether actively connected or offline at the moment of reset) must not accidentally repopulate the clean database by synchronizing pre-reset offline data. When the client application or reconnecting device detects that the server has undergone a reset, it purges its local offline cache and redirects the user to log in afresh.

**Why this priority**: Prevents ghost records and sync pollution where an offline device reconnects post-reset and pushes obsolete historical overtime entries back into the newly reset system.

**Independent Test**: Put a client device in offline mode with pending local overtime entries, execute a server reset from another session, restore network connectivity on the offline device, and verify that the client detects the reset, purges local records without syncing them, and prompts the user to log in.

**Acceptance Scenarios**:

1. **Given** an active client browser session when a reset is completed, **Then** local storage and offline cache are purged immediately and the session is redirected to the welcome/login view.
2. **Given** an offline device with pending offline records created before the reset, **When** that device reconnects to the network, **Then** the system detects the epoch change, prevents merging pre-reset records, purges the local queue, and informs the user that the system was reset.

---

### Edge Cases

- **Concurrent Data Submission**: If another user attempts to log an overtime entry while the factory reset is executing, the submission is rejected and discarded once the transaction begins.
- **Accidental Click Prevention**: The action must require a distinct two-step confirmation (modal with red alert styling and required typing of a verification keyword such as "ZERAR") to avoid accidental execution.
- **Sole Admin Availability**: Wiping all user records without recreating or retaining a default administrator would permanently lock everyone out of the application. The reset procedure must guarantee that a known baseline administrator account exists post-reset.
- **Network Failure During Reset**: The server-side purge must execute within an atomic transaction or coordinated sequence so that partial data deletion does not leave the database in an inconsistent state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict the factory reset capability exclusively to users with verified administrator authority.
- **FR-002**: System MUST require explicit multi-step confirmation, requiring the administrator to enter an exact confirmation keyword (e.g., "ZERAR") before executing the purge.
- **FR-003**: System MUST permanently delete all overtime records, timebank balances, compensation schedules, and access audit logs from the database.
- **FR-004**: System MUST guarantee that a valid baseline administrator account is available immediately post-reset so administrative access is never permanently lost.
- **FR-005**: System MUST provide the capability to purge all stored server backup files during the reset process.
- **FR-006**: System MUST terminate all active user sessions across all devices upon reset completion.
- **FR-007**: Client application MUST invalidate its local offline data store (cached records, sync queue, session state) when a factory reset occurs or is detected upon reconnecting.
- **FR-008**: System MUST maintain a system epoch or reset generation token to prevent offline clients with pre-reset data from syncing obsolete entries back into the fresh database.
- **FR-009**: System MUST display clear warning notifications in the user interface indicating that this action is permanent and irreversible.

### Key Entities

- **SystemResetRequest**: Represents the administrative command specifying the confirmation keyword, the option to include backup file deletion, and the initiating administrator credentials.
- **SystemEpoch**: Represents the current generation/lifecycle identifier of the database instance. Changed upon each reset so client applications can determine whether their local offline state matches the current database lifecycle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Complete system wipe completes within 3 seconds, resulting in exactly zero historical overtime records, zero compensation entries, and zero stale sessions remaining.
- **SC-002**: 100% of reset attempts with missing or non-matching confirmation keywords are rejected with zero modification to stored data.
- **SC-003**: Immediately following a reset, an administrator can log in within 15 seconds and verify a clean dashboard showing 0:00 hours balance.
- **SC-004**: 100% of offline clients reconnecting after a reset detect the system reset and discard pre-reset queues without injecting any pre-reset entries into the database.

## Assumptions

- The factory reset function will be located in the Administration portal (`/admin`) and/or advanced system settings accessible only by administrators.
- When all user accounts are wiped, a standard default administrator account is restored or the current administrator's credentials are preserved as the sole active administrator account so they can immediately log back in.
- The reset confirmation keyword is case-insensitive or clearly displayed (e.g., "ZERAR").
- The action is explicitly irreversible; users are assumed to understand that any data not previously exported to a personal file will be lost.
