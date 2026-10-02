# Feature Specification: User-Scoped Backups, Self-Service Password Change, and Personal Data Controls

**Feature Branch**: `011-user-backup-and-data-controls`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "sobre o backup deve existir um backup geral visivel somente para o admin, masdeve existir backups idividualizados para cada user comum, cada usario comum tem que ter acesso para trocar sua senha e tambem conseguir ter um botao para serar seus regstros e deletar a sua propria conta"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - System-Wide vs. User-Scoped Backup Boundaries (Priority: P1)

As a standard user, I want to export and download a backup containing exclusively my own personal overtime entries, compensations, and preferences so that I can safeguard my personal records. As an administrator, I want system-wide database backups and automated scheduling routines to be visible and manageable only by administrators, preventing standard users from viewing or manipulating global server data.

**Why this priority**: Segregates sensitive system-level server infrastructure from end-user data custody. Ensures confidentiality across users while empowering individual employees to archive their own work history.

**Independent Test**: Log in as a standard user, verify that global system backup history and scheduling controls are hidden, trigger a personal backup, and verify that the exported file contains only the logged-in user's entries. Log in as an administrator and verify full visibility of the system-wide backup controls.

**Acceptance Scenarios**:

1. **Given** an authenticated standard user, **When** they navigate to the backup section in settings, **Then** only the option to export and download their personal data backup is visible, and all system-wide backup routines, retention schedules, and global backup history are hidden.
2. **Given** an authenticated standard user, **When** they click to download their personal backup, **Then** the system produces a file containing exclusively that user's overtime records, compensations, balance settings, and preferences.
3. **Given** an authenticated administrator, **When** they navigate to settings or the administration portal, **Then** the system-wide backup tools (snapshots, automated schedules, retention, and system restore) are fully accessible.
4. **Given** an authenticated standard user attempting to directly request a system-wide backup or global backup download, **Then** the system rejects the request with an access denied message.

---

### User Story 2 - Voluntary Self-Service Password Change (Priority: P2)

As an authenticated user, I want to voluntarily change my password at any time from my settings menu by providing my current password and a new secure password, so that I can maintain personal account security without requiring administrator intervention.

**Why this priority**: Password hygiene is fundamental to self-service account management and user autonomy beyond initial login bootstrapping.

**Independent Test**: Navigate to the account section as any active user, open the password change dialog, submit the current password and a new valid password, and verify successful update followed by login verification using the new password.

**Acceptance Scenarios**:

1. **Given** an authenticated user on their account settings, **When** they request to change their password, **Then** the system presents a secure dialog requesting current password, new password, and new password confirmation with instant strength guidance.
2. **Given** a user submitting an incorrect current password, **When** they attempt to save, **Then** the system rejects the change with an informative error and keeps the existing password intact.
3. **Given** a user submitting a valid current password and a new password that meets complexity standards (at least 8 characters with letters and numbers) matching the confirmation, **When** they confirm the change, **Then** the password is updated and future logins require the new password.

---

### User Story 3 - Personal Records Reset & Account Deletion (Priority: P3)

As a standard user, I want a dedicated option to reset (wipe) only my personal overtime and compensation entries so that I can restart my time bank tracking from scratch without deleting my login account, while also retaining the separate option to permanently delete my account and all associated data.

**Why this priority**: Users occasionally restart a new tracking period, change jobs, or resolve balance discrepancies without wanting to lose their user credentials, username, or login access.

**Independent Test**: As a standard user with existing overtime records and scheduled compensations, trigger the "Reset Records" action with confirmation. Verify all personal records are wiped and balance returns to zero, while the user remains logged in. Verify the separate "Delete Account" action still permanently eradicates both the account and all associated data.

**Acceptance Scenarios**:

1. **Given** a user with recorded overtime entries and compensations, **When** they click the "Reset My Records" button, **Then** a prominent confirmation prompt warns that all their historical hours and compensations will be permanently cleared while their account remains active.
2. **Given** a user confirming the records reset, **When** the operation finishes, **Then** all overtime records and compensations for this user are purged from the server and local device, and the calculated balance resets to zero.
3. **Given** a user who has reset their records, **When** they navigate to their dashboard or history, **Then** they see empty states ready for fresh entries, while their user profile and preferences remain intact.
4. **Given** a user choosing "Delete Account", **When** they confirm the deletion, **Then** both their user account entity and all associated records are permanently erased, and their local session is terminated.

---

### Edge Cases

- **Offline Personal Backup**: If a user attempts to export their personal backup while offline, the system exports the locally available synchronized and draft records stored on the device with a clear timestamp of the export state.
- **Sole Admin Personal Reset vs. System Reset**: If an administrator resets their personal records, only their personal overtime entries are cleared; other users' records and system configuration remain completely intact.
- **Concurrent Active Sessions during Password Change**: When a user changes their password, all active sessions on other devices for that user are invalidated, requiring re-authentication with the new password.
- **Empty Account Reset**: If a user with zero overtime records clicks to reset records, the system processes the request gracefully without error and confirms the zeroed balance state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST restrict global system database backups, backup scheduling, and full database restoration exclusively to users with the administrator role.
- **FR-002**: System MUST hide all global system backup interfaces, schedules, and history from standard non-admin users.
- **FR-003**: System MUST provide an individual data export ("Backup Pessoal") feature accessible to each standard user, containing exclusively their personal overtime records, compensations, and settings.
- **FR-004**: System MUST allow users to download their personal data backup file directly to their local device.
- **FR-005**: System MUST allow any authenticated user to update their own password voluntarily at any time from their account settings.
- **FR-006**: System MUST verify the user's current password before allowing a voluntary password change.
- **FR-007**: System MUST validate that new passwords contain a minimum of 8 characters including letters and numbers, and match the confirmation input.
- **FR-008**: System MUST provide a dedicated action for users to reset (zero out) all of their personal overtime records and scheduled compensations without deleting their account.
- **FR-009**: System MUST require explicit user confirmation before executing a personal records reset.
- **FR-010**: System MUST recalculate and reset the user's net and projected balances to zero upon completion of a records reset.
- **FR-011**: System MUST purge local offline copies of overtime records and compensations on the client device when a personal records reset is confirmed.
- **FR-012**: System MUST retain the separate ability for standard users to delete their account and personal data completely, while maintaining sole administrator lockout protection.
- **FR-013**: System MUST log security audit entries for voluntary password changes, personal records resets, and account deletions.

### Key Entities *(include if feature involves data)*

- **Personal Backup Archive**: A structured, self-contained export document containing an individual user's profile metadata, overtime records, compensation schedules, and balance configuration.
- **User Account**: The authenticated user entity containing username, email, display name, password credentials, and role.
- **Overtime Records**: Individual shifts and overtime entries scoped specifically to the user.
- **Compensation Schedules**: Planned and completed compensatory time-off items scoped to the user.
- **Audit Log Event**: Record of security actions (e.g., `PASSWORD_CHANGED`, `USER_RECORDS_RESET`, `USER_SELF_DELETED`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of standard non-admin users cannot view or trigger global server database backups or view other users' data in backups.
- **SC-002**: Personal data export completes and begins downloading on the user's device in under 1 second for accounts with up to 5,000 entries.
- **SC-003**: Personal records reset clears historical hours and resets balance to zero in under 500 milliseconds.
- **SC-004**: Password changes take effect immediately across all subsequent authentication requests.
- **SC-005**: Mobile touch targets for all new actions (password change, personal backup, records reset, account deletion) strictly respect the minimum dimension of $44 \times 44\text{ px}$.

## Assumptions

- Personal data backup is formatted as an easily parseable, human-readable, and portable structured document (e.g., JSON) rather than a raw server SQLite binary.
- Standard users do not require access to server-level automated recurring cron backups on physical external media, as that is an infrastructure concern handled by the instance owner (admin).
- A personal records reset is permanent and irreversible once confirmed by the user; users are advised to generate a personal backup before resetting if they wish to archive past history.
