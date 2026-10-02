# Quickstart & Verification Guide: Overtime Management

**Feature**: Overtime Management & Time Bank System (`001-overtime-management`)  
**Date**: 2026-10-01  
**Contract Reference**: [api-spec.yaml](contracts/api-spec.yaml)  
**Data Model Reference**: [data-model.md](data-model.md)  

---

## 1. Prerequisites & Environment Setup

- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` or `pnpm`
- **Docker & Docker Compose**: Docker Engine 24+ with Compose v2 (tested for ARM64 and AMD64)

### Local Development Setup
```bash
# Install backend and frontend dependencies
npm install

# Initialize local SQLite development database
npm run db:migrate

# Start local fullstack development server (Hot Module Reload)
npm run dev
# App accessible at http://localhost:3000
```

### Containerized Single-Node Run (Raspberry Pi Simulation)
```bash
# Build and start via Docker Compose
docker compose up -d --build

# Inspect container health and resource footprint
docker stats minhashoras-app --no-stream
# Verify RAM usage remains under 60MB and healthcheck returns healthy
```

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Mobile Overtime Entry & Duration Calculation
1. Open mobile browser or Chrome DevTools in Mobile Emulation mode (e.g., iPhone 14 or Pixel 7) at `http://localhost:3000`.
2. Tap the primary action button (`+ Novo Registro`).
3. Enter:
   - Date: `2026-10-01`
   - Start Time: `18:00`
   - End Time: `20:30`
   - Break Duration: `0 min`
4. Confirm creation.
5. **Expected Outcome**:
   - Record displays immediately in the list with calculated duration `2h 30m` (`150 minutes`).
   - Badge displays `Sincronizado` (or `Pendente` if offline).
   - Dashboard positive balance increments by `+2h 30m`.

### Scenario 2: Overnight Shift Calculation (Crossing Midnight)
1. Tap `+ Novo Registro`.
2. Enter:
   - Date: `2026-10-02`
   - Start Time: `22:00`
   - End Time: `02:30` (next day)
   - Break Duration: `30 min`
3. Confirm creation.
4. **Expected Outcome**:
   - System recognizes overnight interval (`22:00` to `02:30` = 4h 30m; minus 30m break = `4h 00m`).
   - Net duration registers as `240 minutes` (`+4h 00m`).

### Scenario 3: Offline-First Resilience & Automatic Synchronization
1. In Chrome DevTools, open the **Network** tab and toggle `Offline` (or enable Airplane Mode on a physical mobile device).
2. Tap `+ Novo Registro` and submit an entry:
   - Start: `19:00`, End: `21:00` (`2h 00m`).
3. **Verify Offline UI**:
   - Entry appears instantly in the UI with a yellow `Salvo Offline / Pendente` badge.
   - Time bank balance updates optimistically on the dashboard.
   - No blocking loading spinners or network errors appear.
4. Toggle network back to `Online`.
5. **Expected Outcome**:
   - Background sync triggers within 3 seconds.
   - Badge changes to green `Sincronizado`.
   - Entry is durably stored in the SQLite database file on the server.

### Scenario 4: Time Bank Limit Configuration & Warning Banners
1. Navigate to **Configurações / Limites**.
2. Configure:
   - Limite Máximo Positivo: `10 horas` (`600 minutos`).
   - Percentual de Alerta: `80%` (`8 horas`).
3. Add entries totaling `8h 30m`.
4. **Expected Outcome**:
   - Dashboard prominently displays an amber alert banner: `Atenção: Você atingiu 85% do limite máximo do banco de horas`.
5. Add another entry taking total to `10h 30m`.
6. **Expected Outcome**:
   - Dashboard updates to a red critical alert banner: `Limite Excedido: Saldo ultrapassou o teto permitido de 10h`.

### Scenario 5: Pre-Scheduled Compensation & Projected Balance
1. Navigate to **Compensações**.
2. Tap `+ Pré-Agendar Compensação`.
3. Select an upcoming date (`2026-10-15`) and duration `4 horas` (`240 minutos`).
4. **Expected Outcome**:
   - Compensation appears under "Agendadas".
   - Dashboard shows:
     - Saldo Realizado: `+10h 30m`
     - Compensações Agendadas: `-4h 00m`
     - Saldo Projetado: `+6h 30m`

### Scenario 6: Multi-Format Report Export (CSV, XLS, PDF)
1. Navigate to **Relatórios**.
2. Select period: `Mês Atual`.
3. Test Exports:
   - Click `Exportar CSV`: file `relatorio_horas_2026-10.csv` downloads with proper delimiters and headers.
   - Click `Exportar Excel (XLS)`: file `relatorio_horas_2026-10.xlsx` downloads, opening cleanly in Excel/LibreOffice with calculated formula totals.
   - Click `Exportar PDF`: file `relatorio_horas_2026-10.pdf` downloads with header summary and itemized entries.
4. **Expected Outcome**:
   - Each export completes in < 2 seconds.
   - All summaries and totals match between dashboard and reports.

---

## 3. Automated Test Suite Execution
```bash
# Run unit tests (time calculations, midnight handling, limit thresholds)
npm test:unit

# Run contract tests against API endpoints
npm test:contract

# Run offline sync integration tests
npm test:integration
```
