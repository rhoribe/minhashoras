# Research: Fix On-Demand Backup & Database Restore

## Topic 1: Fastify Empty Body Error on On-Demand Backup Trigger

### Context
When the user clicks "Fazer Backup Agora" on the Settings screen, the frontend executes:
```ts
fetch('/api/v1/backups/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```
Fastify defaults to throwing `FST_ERR_CTP_EMPTY_JSON_BODY` ("Body cannot be empty when content-type is set to 'application/json'") when a request supplies `Content-Type: application/json` but has zero body bytes.

### Decision
1. **Frontend Fix**: In `client/src/services/backup-api.ts`, remove `Content-Type: application/json` or supply `body: JSON.stringify({})` for `triggerManualBackup()`. Omitting the header or supplying `{}` eliminates the empty body error across all HTTP clients and browsers.
2. **Backend Defense**: In `server/src/routes/backup-routes.ts`, configure `POST /backups/export` without requiring a body, or accept an optional body `{}` cleanly. Fastify routes with no schema requirement for body will accept requests without content-type smoothly.

### Rationale
- Fixes the issue at both layers (client omission/payload and server permissiveness) to prevent regressions regardless of how the endpoint is invoked (SPA, curl, or external automation).

### Alternatives Considered
- Changing global Fastify JSON parser settings: Rejected because other POST/PUT endpoints benefit from strict JSON validation. Route-level tolerance and client-side correct payload dispatch is cleaner and non-disruptive.

---

## Topic 2: SQLite Live Database Restore Mechanism in WAL Mode

### Context
The Minhas Horas production database runs SQLite with WAL (`journal_mode = WAL`) and `synchronous = NORMAL` (Constitution Principle IV). We need to restore an archive (`.sqlite.gz`) into the active database without corrupting open transactions, crashing the process, or leaving dangling WAL/SHM locks.

### Decision
Use a staged decompression and SQLite Online Backup API workflow:
1. Decompress target `.sqlite.gz` to a temporary file (`temp-restore-<id>.sqlite`).
2. Verify SHA-256 checksum during streaming decompression against `checksumSha256` recorded in `backup_runs`.
3. Open the decompressed temporary database in read-only mode and execute `PRAGMA integrity_check`. If any error occurs, abort.
4. Execute SQLite Online Backup API (`tempDb.backup(activeDbPath)`) to restore all pages safely into the active database.
5. Checkpoint the active database (`activeDb.pragma('wal_checkpoint(TRUNCATE)')`).
6. Unlink the temporary decompressed file.

### Rationale
- `better-sqlite3`'s `db.backup(destinationPath)` utilizes SQLite's native C-level backup API (`sqlite3_backup_*`), which safely copies database pages even if the target file has open reader/writer connections in WAL mode.
- Avoids unlinking or moving active database files, which can cause `EBUSY` on Windows, broken file descriptors on Linux, or corrupted WAL shm mappings.
- Confirmed with Node.js proof-of-concept: `backup()` into active WAL database succeeds and updates live reader queries immediately.

### Alternatives Considered
- Closing `db` connection, swapping file on disk (`fs.renameSync`), and reopening: Fragile if concurrent queries exist or if process locks are held.
- Shell execution (`sqlite3 .restore` or `gunzip | sqlite3`): Violates Principle III (introduces shell dependencies not guaranteed in minimal Alpine/distroless containers).

---

## Topic 3: Pre-Restore Safety Snapshot & Audit Trail

### Context
Accidental restores or restoring an older backup can overwrite recent entries. Without a safety net, an accidental click would permanently lose unsaved data.

### Decision
1. Before applying any restore, automatically trigger an internal safety backup snapshot (`triggerType: 'manual'`, recorded with a pre-restore tag/note or dedicated run).
2. Store the resulting pre-restore backup run ID alongside the restore operation audit log.
3. Require explicit confirmation in the UI via a modal dialog displaying:
   - Target backup timestamp and total records
   - Warning that current database records will be replaced
   - Note reminding user to synchronize local offline entries before restoring

### Rationale
- Fulfills Constitution Principle IV (reliable database persistence, prevent data loss).
- If a user restores by mistake, the pre-restore snapshot immediately appears in the backup history list, allowing a 1-click rollback to the state right before the restore.

### Alternatives Considered
- Restoring without pre-backup: High risk of irreversible data loss. Rejected.
- Requiring typing a confirmation phrase: Good for enterprise destructive actions, but on mobile devices (Constitution Principle I), typing long confirmation strings is cumbersome. A dedicated two-step modal with prominent "Confirmar Restauração" button and clear warnings provides the optimal balance of safety and mobile ergonomics.

---

## Topic 4: Mobile Ergonomics and Client Refresh Workflow

### Context
Minhas Horas is a mobile-first PWA (Constitution Principle I). The backup history list and restore actions must be easily navigable on touch devices.

### Decision
1. In `client/src/views/SettingsView.vue`:
   - For each completed backup run, add a "Restaurar" button next to "Baixar" with a minimum touch target size of 44x44px.
   - Use a distinctive confirmation modal with a warning icon, detailed metadata, and cancel/confirm buttons (min 44px height).
   - Upon successful restore, display a success toast/banner, reload backup history and status, and prompt or trigger a refresh of the main store/data cache so the user sees restored records immediately.
2. In `client/src/services/backup-api.ts`:
   - Add `restoreBackup(id: string): Promise<RestoreResult>`.
   - Update `triggerManualBackup()` to not send empty JSON headers without body.

### Rationale
- Completely adheres to Principle I (touch targets >= 44x44px) and Principle II (clear synchronization messaging).
