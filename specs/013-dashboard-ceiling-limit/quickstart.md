# Quickstart Validation Guide: Dynamic Positive Limit Ceiling

This guide provides end-to-end validation scenarios to verify that the dashboard ceiling indicator and capacity progress bar correctly reflect the user's configured positive limit.

## Prerequisites

1. Node.js 22+ installed.
2. Dependencies installed: `npm install`.
3. Database initialized: `npm run db:migrate`.
4. Dev server running: `npm run dev` (or test environment via `npm test`).

---

## Scenario 1: Changing Positive Limit in Settings and Verifying Dashboard

**Goal**: Verify that changing the maximum positive limit in Settings directly alters the ceiling indicator and percentage calculation on the Dashboard.

### Step-by-Step Instructions

1. **Log in** with an active user account (e.g. `testuser`).
2. Navigate to **Configurações** (`/settings`).
3. Scroll to **Limites de Segurança do Banco**.
4. In the field **Limite Máximo Positivo (horas de teto)**:
   - Change value from `40` to `20`.
5. Click **Salvar Configurações** and verify the success toast appears.
6. Navigate to **Painel** (`/dashboard`).
7. **Verification**:
   - Locate the main balance card (`BalanceCard`).
   - Confirm the ceiling label states **`Uso do teto (+20h)`** (previously showed `+40h`).
   - If the user has 10 hours banked, confirm the capacity displays **`50%`** (10h / 20h = 50%, whereas on 40h it would have displayed 25%).
   - Return to `/settings`, change to `60` hours, click save, and recheck `/dashboard`.
   - Confirm the label updates immediately to **`Uso do teto (+60h)`** and capacity shows **`17%`** (10h / 60h = 16.6% -> 17%).

---

## Scenario 2: Offline Resilience Verification

**Goal**: Verify that after saving custom settings, disconnecting internet connectivity preserves the custom ceiling on the dashboard.

### Step-by-Step Instructions

1. Open browser DevTools (F12) -> **Network** tab.
2. Set network throttling to **Offline**.
3. Reload or navigate within the application to `/dashboard`.
4. **Verification**:
   - The balance card retains the customized ceiling (e.g. `Uso do teto (+20h)`).
   - No crash or revert to `+40h` occurs.
   - The warning banner (`LimitAlertBanner`) displays thresholds calculated from 20h (e.g. alert at 16h / 80%).

---

## Scenario 3: Automated Test Execution

Run the targeted unit and integration tests:

```bash
npx vitest run client/src/services/balance-service.test.ts
npm test
```

### Expected Output
- All tests pass with 0 errors.
- Balance service confirms custom `max_positive_limit_minutes` loads properly from IndexedDB preferences and defaults gracefully when absent.
