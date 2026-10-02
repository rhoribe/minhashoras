# Quickstart & Validation Guide: Desktop Responsive UI & Layout Craft

**Feature Branch**: `003-desktop-responsive-ui`
**Date**: 2026-10-01

This guide provides procedures to validate all user scenarios and responsive layout requirements defined in [spec.md](./spec.md) and [contracts/layout-contract.json](./contracts/layout-contract.json).

---

## 1. Setup & Launch

1. Start development server:
   ```bash
   npm run dev
   ```
   *Expected outcome*: Client serves on `http://localhost:5173` and backend runs on `http://localhost:3000`.

2. Open browser window at `http://localhost:5173/`.

---

## 2. Validation Scenarios

### Scenario 1: Desktop App Shell & Sidebar Navigation (P1)
1. Maximize the browser window to full desktop resolution ($\ge 1024\text{px}$ width).
2. Log into the application (or view an active session).
3. **Verification**:
   - The application does NOT render constrained to a 448px phone column in the center of the screen.
   - A persistent left-hand navigation sidebar (width: 256px) displays application branding, navigation links ("Painel", "Registros", "Compensações", "Relatórios", "Ajustes"), active route indicator, user profile badge, and the ThemeSwitcher.
   - The mobile bottom navigation bar is completely hidden.
   - The content container expands up to `max-w-7xl` with balanced padding.

### Scenario 2: Mobile Viewport & Bottom Navigation Preservation (P1)
1. Open Chrome DevTools (`F12` or `Cmd+Option+I`) and enable device emulation (e.g. iPhone 14, 390px width).
2. Inspect navigation and layout.
3. **Verification**:
   - The desktop sidebar is hidden.
   - The mobile bottom navigation bar appears anchored at the bottom with safe-area padding.
   - All navigation items and action buttons maintain touch targets $\ge 44\times 44\text{px}$.
   - Zero horizontal overflow or scrollbar occurs.

### Scenario 3: Multi-Column Dashboard Inspection (P2)
1. On desktop viewport ($\ge 1024\text{px}$), navigate to "Painel" (`/`).
2. Log one or more overtime entries.
3. **Verification**:
   - The Dashboard organizes into a multi-column responsive layout:
     - Left column: Limit Alert Banner, Main Balance Card (with positive/negative/net metrics), and Quick Action buttons.
     - Right column: Recent Overtime Shifts list and shortcuts.
   - No unnecessary vertical scrolling is needed to see recent activities on standard 1080p monitors.

### Scenario 4: Records Data Table & Modal Keyboard Dismissal (P3/P4)
1. On desktop viewport ($\ge 1024\text{px}$), navigate to "Registros" (`/records`).
2. **Verification**:
   - Overtime entries render in a clean, high-craft data table with columns: Data, Horário, Intervalo, Total Líquido, Categoria, Status, and Ações.
3. Click "Novo Registro" (or press modal trigger).
4. **Verification**:
   - The form opens as an elegantly centered dialog modal with subtle backdrop blur (not an edge-anchored bottom sheet).
5. Press the `Escape` key on the keyboard.
6. **Verification**:
   - The modal immediately dismisses without saving, returning focus to the page.

---

## 3. Automated Test Execution

Run the automated test suite verifying responsive composables and contract expectations:

```bash
npm run test
```

*Expected outcome*: All test suites pass with zero failures.
