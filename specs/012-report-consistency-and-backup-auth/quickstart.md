# Quickstart & Verification Guide: Report Consistency and Backup Authentication

**Feature**: `012-report-consistency-and-backup-auth`

This guide outlines runnable scenarios to verify end-to-end functionality for report consistency and authenticated backups.

## Prerequisites

1. Application dependencies installed (`npm install`).
2. Server running or test suites executable (`npm test`).
3. Database initialized with initial admin user (`admin` / `admin123`).

---

## Verification Scenarios

### Scenario 1: Report Generation User Scoping & Parity
1. **Setup**:
   - Log in as `admin`. Create two overtime records for the current month.
   - Register a second standard user (`funcionario_a`). Log in and create one overtime record for the current month.
2. **Action (User View)**:
   - As `funcionario_a`, open the **Relatórios** view.
   - Verify on-screen preview shows exactly 1 record and the correct total minutes.
   - Click "Documento PDF", "Planilha Excel", and "Dados CSV".
3. **Verification**:
   - Verify all exported files contain exclusively `funcionario_a`'s single record and totals matching the on-screen preview.
   - Verify none of `admin`'s records appear in `funcionario_a`'s report.
   - Verify HTTP request to `/api/v1/reports/export` included `Authorization: Bearer <token>`.

### Scenario 2: Unauthenticated Report Rejection
1. **Action**:
   - Send `GET /api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31` without `Authorization` header.
2. **Verification**:
   - Server returns HTTP 401 Unauthorized (`Token de autenticação não fornecido.`).
   - Server does not return default or unauthenticated data.

### Scenario 3: On-Demand Manual Backup Execution
1. **Setup**:
   - Log in as `admin`.
   - Navigate to **Configurações** -> **Backup do Sistema (Admin)**.
2. **Action**:
   - Click "Fazer Backup Agora".
3. **Verification**:
   - Button shows loading state (`isBackingUp`).
   - Request to `POST /api/v1/backups/export` succeeds with HTTP 200.
   - Success alert appears: `Backup gerado com sucesso! Arquivo: ...`
   - Backup history list updates and shows the new backup entry with size, timestamp, and download action.
   - Click download on the new backup and verify the `.sqlite.gz` file downloads without token errors.

### Scenario 4: Standard User Restriction on System Backups
1. **Setup**:
   - Log in as standard user `funcionario_a`.
2. **Action**:
   - Attempt to call `POST /api/v1/backups/export` or access admin backup endpoints.
3. **Verification**:
   - Server returns HTTP 403 Forbidden (`Acesso negado. Recurso restrito a administradores.`).

---

## Automated Test Execution

Run the automated test suites to validate server-side and client-side guarantees:

```bash
# Run all tests
npm test

# Run reports route tests
npx vitest run server/tests/reports.test.ts

# Run backup authentication tests
npx vitest run server/tests/backup-auth.test.ts
```
