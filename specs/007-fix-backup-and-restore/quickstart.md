# Quickstart & Validation Guide: Fix On-Demand Backup & Restore

This guide describes how to validate the backup fix and database restore features end-to-end.

## Prerequisites

1. Node.js 20+ installed.
2. Application dependencies installed (`npm install`).
3. Local test environment or dev server running.

---

## Scenario 1: Manual Backup Trigger (Fix Verification)

**Goal**: Verify that clicking "Fazer Backup Agora" or sending `POST /api/v1/backups/export` succeeds immediately without Fastify "body cannot be empty" error.

### Step 1: Run via API or UI
```bash
# Verify with empty body and no Content-Type
curl -i -X POST http://localhost:3000/api/v1/backups/export

# Verify with empty JSON Content-Type (previously failing condition)
curl -i -X POST http://localhost:3000/api/v1/backups/export \
  -H "Content-Type: application/json" \
  -d "{}"
```

### Expected Outcome:
- HTTP status: `202 Accepted`
- Response body contains a valid `BackupRun` JSON object with `status: "completed"`, `fileName`, and `fileSizeBytes > 0`.
- Zero `400 Bad Request` or `body cannot be empty` errors.

---

## Scenario 2: Backup History Listing & Real-Time Update

**Goal**: Ensure backup records are visible, properly formatted, and update immediately.

### Step 1: Check UI or Query History
1. Navigate to `/settings` in the web application.
2. Scroll to the "Histórico de Backups e Auditoria" card.
3. Observe the list of completed backups.
4. Click "Fazer Backup Agora".

### Expected Outcome:
- The new backup appears at the top of the history list within 1-2 seconds without manual page reload.
- Card displays formatted date, file size (e.g. `45.2 KB`), record count, and SHA-256 fingerprint preview.
- "Baixar" and "Restaurar" buttons are rendered with touch target minimum dimensions (>= 44x44px).

---

## Scenario 3: Safe Database Restore Flow

**Goal**: Verify that restoring a backup successfully rolls back database records while taking an automatic pre-restore safety snapshot.

### Step 1: Record Baseline Data
1. Check current overtime entries count (e.g., 5 entries).
2. Create a manual backup (Backup A).
3. Add a new overtime entry (total: 6 entries).

### Step 2: Trigger Restore
1. Go to Settings > Histórico de Backups.
2. Find Backup A in the list and click "Restaurar".
3. Verify that the confirmation modal appears displaying:
   - Backup timestamp and record count.
   - Warning about replacing current data.
   - Confirmation button "Confirmar Restauração" (min 44px touch target).
4. Click "Confirmar Restauração".

### Expected Outcome:
- System displays an in-progress indicator while performing the pre-restore snapshot and restore.
- Toast / banner notification confirms success: "Banco de dados restaurado com sucesso!".
- A new pre-restore backup snapshot appears in the backup history list.
- Checking overtime records confirms count reverted back to 5 entries.

---

## Scenario 4: Error Handling & Guardrails

### 1. Concurrent Operation Rejection
- Trigger a restore or backup while another is executing.
- **Expected**: HTTP `409 Conflict` with "A backup or restore process is already in progress".

### 2. Corrupted Archive Rejection
- Attempt to restore a non-existent or corrupted file ID.
- **Expected**: HTTP `404 Not Found` or `422 Unprocessable Entity`; live database remains completely untouched.

---

## Running Automated Tests

Run the dedicated test suite verifying the fix and restore functionality:
```bash
npm run test tests/backup.test.ts
```
