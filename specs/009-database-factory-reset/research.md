# Research: Database Factory Reset and System Purge

## Technical Decisions

### Decision 1: Two-Step Safety Gate & Confirmation Keyword

- **Decision**: Require explicit typing of the confirmation keyword `ZERAR` (case-insensitive) inside a high-alert confirmation modal, verified on both client and server before triggering data purge.
- **Rationale**: A factory reset is completely irreversible. Standard "Are you sure?" modal buttons are susceptible to accidental double-clicking or habitual clicking. Requiring a typed phrase guarantees deliberate intent.
- **Alternatives Considered**:
  - *Simple confirm button*: Rejected due to high risk of accidental data destruction.
  - *Password prompt*: Typing current password is good, but does not explicitly convey that the entire database is about to be wiped. Requiring `ZERAR` forces semantic comprehension.

### Decision 2: Scope of Database Purge and Admin Account Preservation

- **Decision**:
  - Operational data: Execute `DELETE FROM overtime_records;`, `DELETE FROM compensation_schedules;`, `DELETE FROM access_audit_logs;`, `DELETE FROM user_sessions;`.
  - User accounts: Delete all non-admin users (`DELETE FROM users WHERE role != 'admin' OR id != :currentAdminId`). Retain the active calling administrator account and reset their `time_bank_balance` to 0 minutes and default preferences.
  - System metadata: Update `system_metadata` with a new `epoch` UUID and `last_reset_at` timestamp.
  - Audit logging: Immediately after table purge, record a single fresh audit log: `event_type = 'SYSTEM_RESET'`, `user_id = :currentAdminId`, `details = 'Factory reset executed. All historical records wiped.'`.
- **Rationale**: Deleting 100% of user accounts would leave the system in an orphaned state with no way to log in without host CLI intervention. Preserving the executing administrator guarantees seamless re-entry while resetting all operational data to zero.
- **Alternatives Considered**:
  - *Hard reset dropping all tables and running migrations*: Resets table structures, but requires re-seeding default credentials (`admin123`) which might overwrite custom admin passwords or cause migration file locking issues while the Fastify server is running.
  - *Deleting all users and prompting initial user registration*: Adds unnecessary complexity to user setup when an authenticated admin already initiated the wipe.

### Decision 3: Backup Archive Purge Strategy

- **Decision**: Provide a `deleteBackups` boolean parameter in the reset payload (default: `true`).
  - When enabled, retrieve all `backup_runs` and also scan the configured backup directory (`backups/`).
  - Use `fs.unlinkSync` (wrapped in try/catch to ignore missing files) for each `.sqlite` / `.zip` / `.db` backup file on disk.
  - Execute `DELETE FROM backup_runs;`.
- **Rationale**: User explicitly requested "apagar backups e todos os dados da base , como se fosse zerar tudo para comecar do inicio". Purging both database rows and physical backup files ensures a clean disk state.
- **Alternatives Considered**:
  - *Retaining backups by default*: Safe, but contradicts the explicit user requirement of "zerar tudo para comecar do inicio". Defaulting to true with a visible toggle satisfies both thorough cleanup and safety.

### Decision 4: Client Cache Invalidation & Offline Protection

- **Decision**:
  - Client that triggers reset: Immediately clears Dexie tables (`localDb.overtimeRecords.clear()`, `localDb.compensations.clear()`, `localDb.syncQueue.clear()`, `localDb.preferences.clear()`, `localDb.activeSession.clear()`), wipes `localStorage`, and redirects to `/login`.
  - Offline / reconnecting clients: Introduce `system_epoch` check in `/api/v1/auth/status` and sync handshake. If the server epoch differs from the client's cached epoch, the client automatically wipes its offline `syncQueue` and local records to prevent ghost sync.
- **Rationale**: Prevents stale offline data on other devices from repopulating the server after a factory reset.
- **Alternatives Considered**:
  - *Blind sync on reconnect*: Would silently re-upload deleted records from offline clients, defeating the factory reset.
