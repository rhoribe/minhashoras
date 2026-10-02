# Data Model: Fix On-Demand Backup & Database Restore

## Entities

### 1. BackupRun (Existing SQLite Entity)

Represents an individual backup execution instance (scheduled or on-demand manual).

- **Table**: `backup_runs`
- **Fields**:
  - `id` (TEXT, PRIMARY KEY): Unique identifier (UUID).
  - `schedule_id` (TEXT, NULL): Reference to `backup_schedules(id)`, null for purely manual runs.
  - `trigger_type` (TEXT, NOT NULL): `'automated' | 'manual'`.
  - `status` (TEXT, NOT NULL): `'pending' | 'in_progress' | 'completed' | 'failed' | 'purged'`.
  - `file_name` (TEXT, NULL): Name of the generated `.sqlite.gz` archive (e.g. `minhashoras-backup-20261002-113000.sqlite.gz`).
  - `file_path` (TEXT, NULL): Absolute path to the physical archive on disk.
  - `file_size_bytes` (INTEGER, NULL): Compressed file size in bytes.
  - `checksum_sha256` (TEXT, NULL): Cryptographic SHA-256 hash for integrity verification.
  - `records_count` (INTEGER, NULL): Total count of overtime records, categories, and logs preserved in snapshot.
  - `error_message` (TEXT, NULL): Detailed error message if backup execution failed.
  - `started_at` (TEXT, NOT NULL): ISO 8601 timestamp of execution start.
  - `completed_at` (TEXT, NULL): ISO 8601 timestamp of completion.
  - `created_at` (TEXT, NOT NULL): Record creation timestamp.

- **State Transitions**:
  ```text
  [Start] ──> pending ──> in_progress ──┬──> completed ──> purged (via retention)
                                        └──> failed
  ```

---

### 2. RestoreOperation (Logical & Audit Entity)

Represents an administrative operation restoring system state from a historical backup.

- **Attributes**:
  - `id` (string): Unique identifier (UUID).
  - `targetBackupId` (string): ID of the `BackupRun` selected for restoration.
  - `preRestoreBackupId` (string): ID of the safety `BackupRun` created right before the restore took place.
  - `status` (string): `'in_progress' | 'completed' | 'failed'`.
  - `recordsRestored` (number): Total count of records restored into the active database.
  - `executedAt` (string): ISO 8601 timestamp when restore started.
  - `completedAt` (string, optional): ISO 8601 timestamp when restore finalized.
  - `errorMessage` (string, optional): Error details if restore aborted or failed.

- **Relationships**:
  - `targetBackupId` references `BackupRun.id`
  - `preRestoreBackupId` references `BackupRun.id`

---

### 3. Client DTOs

#### `RestoreBackupResult`
Payload returned to the client when a database restore succeeds:
```ts
export interface RestoreBackupResult {
  success: boolean;
  message: string;
  restoredFromRun: {
    id: string;
    fileName: string | null;
    startedAt: string;
    recordsCount: number | null;
  };
  preRestoreRun: {
    id: string;
    fileName: string | null;
  };
}
```

#### `ManualBackupTriggerPayload`
Empty object `{}` or no body payload sent to `POST /api/v1/backups/export`.

---

## Validation Rules

1. **Concurrent Operations**: Only one backup or restore operation may execute at any given time. If `isExecuting` or an active `BackupRun` with status `in_progress` exists, incoming backup or restore requests must be rejected with HTTP 409 Conflict.
2. **File Existence & Status**: A backup can only be restored if its status is `'completed'` and its physical file exists on disk (status is not `'purged'`).
3. **Integrity Validation**: Target backup archive must pass SHA-256 verification and `PRAGMA integrity_check` before being applied to the live database file.
4. **Pre-Restore Mandatory**: A pre-restore safety backup must complete successfully before any data replacement occurs.
