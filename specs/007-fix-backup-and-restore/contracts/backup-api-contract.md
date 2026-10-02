# API Contract: Backup & Restore Endpoints

## 1. Trigger Manual Backup (Fixed)

Executes an immediate manual backup of the active database without requiring a request body.

- **URL**: `/api/v1/backups/export`
- **Method**: `POST`
- **Headers**:
  - `Content-Type`: optional (`application/json` or omitted)
- **Request Body**: None required, or empty JSON object `{}`.

### Responses

#### 202 Accepted
Backup process successfully accepted and initiated/completed.
```json
{
  "id": "c7a6e191-4927-4f6c-829d-4e9e4f7a1c32",
  "scheduleId": null,
  "triggerType": "manual",
  "status": "completed",
  "fileName": "minhashoras-backup-20261002-114500.sqlite.gz",
  "fileSizeBytes": 45312,
  "checksumSha256": "8a32b6e174f...72a",
  "recordsCount": 142,
  "errorMessage": null,
  "startedAt": "2026-10-02T11:45:00.000Z",
  "completedAt": "2026-10-02T11:45:01.200Z"
}
```

#### 409 Conflict
A backup or restore operation is already currently executing.
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A backup or restore process is already in progress"
}
```

---

## 2. Restore Database from Backup (New)

Restores the active database to the snapshot contained in the specified backup archive.

- **URL**: `/api/v1/backups/:id/restore`
- **Method**: `POST`
- **Path Parameters**:
  - `id` (string, required): UUID of the completed `BackupRun` to restore.
- **Request Body**: None required, or optional `{ "skipPreRestore": false }`.

### Responses

#### 200 OK
Database restored successfully.
```json
{
  "success": true,
  "message": "Database restored successfully",
  "restoredFromRun": {
    "id": "c7a6e191-4927-4f6c-829d-4e9e4f7a1c32",
    "fileName": "minhashoras-backup-20261002-114500.sqlite.gz",
    "startedAt": "2026-10-02T11:45:00.000Z",
    "recordsCount": 142
  },
  "preRestoreRun": {
    "id": "d9f8e212-1111-4444-8888-555555555555",
    "fileName": "minhashoras-backup-20261002-115000.sqlite.gz"
  }
}
```

#### 404 Not Found
Target backup run not found, physical file deleted, or status is purged.
```json
{
  "statusCode": 404,
  "error": "NotFound",
  "message": "Backup run not found or physical archive file has been purged"
}
```

#### 409 Conflict
Another backup or restore operation is already in progress.
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "A backup or restore process is already in progress"
}
```

#### 422 Unprocessable Entity
Archive checksum mismatch or database integrity check failed.
```json
{
  "statusCode": 422,
  "error": "UnprocessableEntity",
  "message": "Backup archive integrity check failed: database corrupt or checksum mismatch"
}
```

---

## 3. List Backup Runs (Existing, Verified)

Retrieves paginated history of backup runs.

- **URL**: `/api/v1/backups/history`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (number, default: 20): Maximum records to return.
  - `offset` (number, default: 0): Pagination offset.

### Responses

#### 200 OK
```json
{
  "total": 3,
  "runs": [
    {
      "id": "c7a6e191-4927-4f6c-829d-4e9e4f7a1c32",
      "scheduleId": null,
      "triggerType": "manual",
      "status": "completed",
      "fileName": "minhashoras-backup-20261002-114500.sqlite.gz",
      "fileSizeBytes": 45312,
      "checksumSha256": "8a32b6e174f...72a",
      "recordsCount": 142,
      "errorMessage": null,
      "startedAt": "2026-10-02T11:45:00.000Z",
      "completedAt": "2026-10-02T11:45:01.200Z"
    }
  ]
}
```

---

## 4. Download Backup Archive (Existing, Verified)

Streams the physical compressed backup archive to the client with `Content-Disposition`.

- **URL**: `/api/v1/backups/:id/download`
- **Method**: `GET`
- **Path Parameters**:
  - `id` (string, required): UUID of the backup run.

### Responses

#### 200 OK
- **Headers**:
  - `Content-Type: application/gzip`
  - `Content-Disposition: attachment; filename="minhashoras-backup-..."`
  - `X-Checksum-SHA256: <sha256>`
