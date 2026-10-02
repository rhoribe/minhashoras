# Research & Technical Decisions: Report Consistency and Backup Authentication

**Feature**: `012-report-consistency-and-backup-auth`
**Date**: 2026-10-02

## 1. Authentication Header Propagation in Backup API Service

### Context
In Feature 011, `requireAdmin` was enforced on all `/api/v1/backups/*` routes to secure system backups. However, `client/src/services/backup-api.ts` used raw `fetch()` calls without attaching credentials (`headers: { ...getAuthHeader() }`), causing Fastify to reject all manual backups, schedules, history, and status calls with HTTP 401 (`Token de autenticação não fornecido.`).

### Decision
Import `getAuthHeader()` from `../services/auth.js` in `client/src/services/backup-api.ts` and merge it into every HTTP request:
- `getBackupSchedule()`: `headers: { ...getAuthHeader() }`
- `updateBackupSchedule()`: `headers: { 'Content-Type': 'application/json', ...getAuthHeader() }`
- `triggerManualBackup()`: `headers: { 'Content-Type': 'application/json', ...getAuthHeader() }`
- `getBackupStatus()`: `headers: { ...getAuthHeader() }`
- `getBackupHistory()`: `headers: { ...getAuthHeader() }`
- `downloadBackup()`: `headers: { ...getAuthHeader() }`
- `restoreBackup()`: `headers: { 'Content-Type': 'application/json', ...getAuthHeader() }`

### Rationale
- Standardized pattern across all authenticated API modules in the codebase (`user-api.ts`, `sync.ts`, `theme.ts`, `admin.ts`).
- Guarantees immediate authorization without architectural rework or cookie handling.
- Prevents technical token error popups when the admin is properly logged in.

### Alternatives Considered
- Query parameter tokens (`?token=...`): Rejected as tokens in URLs leak into web server access logs and browser history.
- Cookie-based authentication: Rejected because the application architecture is a PWA that uses Bearer tokens stored in persistent client storage and verified on each request.

---

## 2. Server & Client Report Data Scoping and Parity

### Context
Users experienced inconsistency between the on-screen preview and downloaded reports:
1. `client/src/services/client-report-generator.ts` was executing `fetch(/api/v1/reports/export?...)` without any `Authorization` header.
2. `server/src/routes/reports.ts` was using `optionalAuthenticate` and falling back to `'default_user'`:
   `const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';`
   Because no token was passed, the server queried records for `default_user` instead of the authenticated user's records.
3. In offline mode, `client-report-generator.ts` queried `localDb.overtimeRecords.where('record_date').between(...)` without filtering by `user_id`. On a shared device with multiple accounts, offline reports could aggregate data from all users.

### Decision
1. **Server Route**:
   - Change `app.addHook('preHandler', optionalAuthenticate)` to `app.addHook('preHandler', authenticate)` in `server/src/routes/reports.ts`.
   - Ensure `req.userId` is mandatory. If unauthenticated, Fastify immediately returns HTTP 401 with a clear message.
2. **Client Export Generator**:
   - In `exportReport()`, pass `headers: { ...getAuthHeader() }` in the fetch request.
   - If response is 401, throw a user-friendly error informing that the session has expired.
   - In offline fallback mode, query `localDb.overtimeRecords.where('user_id').equals(getCurrentUserId()).toArray()`, then filter by the selected `startDate` and `endDate`.
3. **Reports View (`ReportsView.vue`)**:
   - In `loadPreview()`, filter records strictly by `getCurrentUserId()`.
   - Trigger `syncManager.triggerSync()` on mount to ensure local IndexedDB contains the freshest server records before rendering preview and executing exports.

### Rationale
- Completely eliminates cross-user data leakage both online and offline.
- Eliminates discrepancy between what is rendered on screen in the preview and what is produced in PDF/Excel/CSV files.
- Enforces zero-trust authentication on all report endpoints.

### Alternatives Considered
- Retaining `optionalAuthenticate` with fallback to `default_user`: Rejected because silent fallbacks hide authentication bugs and expose incorrect data.

---

## 3. Graceful Error Handling & Session Expiration Flow

### Context
When a user's session expires while they are on the Reports or Admin Settings page, clicking an action should not crash with a raw stack trace or cryptic JSON error.

### Decision
- Catch 401 errors specifically in both `backup-api.ts` and `client-report-generator.ts`.
- Format message as: `"Sua sessão expirou. Por favor, faça login novamente."`
- Display feedback cleanly in the existing message areas (`backupMessage` in SettingsView, `exportingMessage` in ReportsView).

### Rationale
- Meets Non-Technical Stakeholder and Usability guidelines (FR-008, SC-004).
- Prevents user confusion.

---

## Summary of Technical Changes

| Component | Target File | Nature of Change |
|-----------|-------------|------------------|
| Client Backup Service | `client/src/services/backup-api.ts` | Attach `getAuthHeader()` to all 7 backup API calls; handle 401 clearly |
| Client Report Generator | `client/src/services/client-report-generator.ts` | Attach `getAuthHeader()` to export fetch; filter by `getCurrentUserId()` in offline fallback; handle 401 |
| Server Reports Route | `server/src/routes/reports.ts` | Enforce `authenticate` preHandler; require `req.userId`; eliminate `default_user` fallback |
| Client Reports View | `client/src/views/ReportsView.vue` | Trigger sync on mount/preset change; ensure strict user ID filtering and parity with export |
| Tests | `server/tests/reports.test.ts` & `server/tests/backup-auth.test.ts` | Add integration tests verifying authenticated report scoping and backup endpoints |
