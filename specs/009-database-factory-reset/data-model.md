# Data Model: Database Factory Reset and System Purge

## Entities & Schemas

### 1. Database Entities

#### `system_metadata`
Stores runtime and deployment metadata, including current system epoch for cache invalidation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | `TEXT` | `PRIMARY KEY` | Metadata key (e.g. `'system_epoch'`, `'last_reset_at'`) |
| `value` | `TEXT` | `NOT NULL` | Serialized value or string (e.g. UUID, ISO timestamp) |
| `updated_at` | `TEXT` | `NOT NULL` | Timestamp of last modification |

---

### 2. Request & Response DTOs

#### `SystemResetRequest`
Payload sent by the client when initiating a factory reset.

```typescript
export interface SystemResetRequest {
  /**
   * Confirmation keyword required to execute the reset.
   * Must match "ZERAR" (case-insensitive).
   */
  confirmation: string;

  /**
   * Whether to delete stored backup files from the disk backup directory.
   * Defaults to true if omitted.
   */
  deleteBackups?: boolean;
}
```

#### `SystemResetResult`
Response returned by the server upon successful execution.

```typescript
export interface SystemResetResult {
  success: boolean;
  message: string;
  wipedRecordsCount: number;
  wipedBackupsCount: number;
  epoch: string;
  resetAt: string;
}
```

---

### 3. State Transitions & Lifecycle

```
[ Normal Operation ]
        │
        ▼ (Admin triggers reset + confirms "ZERAR")
[ Begin Atomic SQLite Transaction ]
        ├─ Count & delete overtime_records
        ├─ Count & delete compensation_schedules
        ├─ Count & delete user_sessions
        ├─ Delete non-admin users (preserve executing admin)
        ├─ Reset executing admin time_bank_balance to 0
        ├─ Clear backup_runs table
        ├─ Unlink backup files on disk (if deleteBackups is true)
        ├─ Generate new system_epoch UUID in system_metadata
        └─ Insert single fresh audit log: SYSTEM_RESET
        │
[ Commit Transaction ]
        │
        ▼
[ Client Response: 200 OK ]
        │
        ├─ Client clears Dexie localDb (all tables)
        ├─ Client clears localStorage session
        └─ Redirect to /login
```
