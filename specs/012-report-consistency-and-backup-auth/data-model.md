# Data Model: Report Consistency and Backup Authentication

**Feature**: `012-report-consistency-and-backup-auth`
**Date**: 2026-10-02

## 1. Entities & Schema Alignment

### 1.1 Overtime Record (`overtime_records`)
Stored in SQLite server-side and IndexedDB client-side. Every record is strictly tied to a user.

| Field | Type | Storage | Description |
|-------|------|---------|-------------|
| `id` | `TEXT` (UUID) | SQLite & IndexedDB | Unique record identifier (Primary Key) |
| `user_id` | `TEXT` | SQLite & IndexedDB | Owner user ID (Foreign Key to `users.id`) |
| `record_date` | `TEXT` (YYYY-MM-DD) | SQLite & IndexedDB | Date of overtime shift |
| `start_time` | `TEXT` (HH:MM) | SQLite & IndexedDB | Shift start time |
| `end_time` | `TEXT` (HH:MM) | SQLite & IndexedDB | Shift end time |
| `break_duration_minutes`| `INTEGER` | SQLite & IndexedDB | Unpaid break duration |
| `net_overtime_minutes` | `INTEGER` | SQLite & IndexedDB | Computed net overtime duration |
| `category` | `TEXT` | SQLite & IndexedDB | Work category / tag |
| `description` | `TEXT` | SQLite & IndexedDB | Optional notes or shift details |
| `created_at` | `TEXT` (ISO8601) | SQLite & IndexedDB | Record creation timestamp |
| `updated_at` | `TEXT` (ISO8601) | SQLite & IndexedDB | Record update timestamp |

**Integrity Rule**: Report generation queries (both SQL queries in `recordsRepository.findAll` and IndexedDB Dexie queries in `client-report-generator.ts` / `ReportsView.vue`) MUST include `user_id = :authenticated_user_id` as an unconditional filter predicate.

---

### 1.2 Report Parameters & Data Structure

Represents the data payload transferred when generating an overtime report.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `userId` | `string` | Session Token | Extracted securely from `req.userId` via `authenticate` |
| `format` | `'csv' \| 'xlsx' \| 'pdf'` | Query Param | Desired document output format |
| `startDate` | `string` (YYYY-MM-DD) | Query Param | Start of report period (inclusive) |
| `endDate` | `string` (YYYY-MM-DD) | Query Param | End of report period (inclusive) |
| `totalMinutes` | `number` | Computed | Sum of `net_overtime_minutes` for user within period |
| `recordsCount` | `number` | Computed | Total count of user records within period |

---

### 1.3 Backup Operation Payload & State

Represents administrative system backup operations triggered through `/api/v1/backups/*`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier of the backup run |
| `triggerType` | `'manual' \| 'automated'` | Trigger origin |
| `status` | `'pending' \| 'in_progress' \| 'completed' \| 'failed' \| 'purged'` | Execution state |
| `fileName` | `string \| null` | Generated `.sqlite.gz` archive name |
| `fileSizeBytes` | `number \| null` | Archive size on disk in bytes |
| `checksumSha256`| `string \| null` | SHA-256 integrity hash |
| `recordsCount` | `number \| null` | Total records backed up |
| `startedAt` | `string` (ISO8601) | Execution start timestamp |
| `completedAt` | `string \| null` | Execution end timestamp |

**Authorization Rule**: All backup operations require an active user session with `role === 'admin'`. Standard users or unauthenticated calls receive HTTP 403 Forbidden or HTTP 401 Unauthorized.
