# Quickstart & Validation Guide: Authentication, Multi-User Support & Impeccable Theming

**Feature Branch**: `002-auth-multiuser-theme`
**Date**: 2026-10-01

This guide provides step-by-step procedures to validate all user journeys and technical requirements defined in [spec.md](./spec.md), [data-model.md](./data-model.md), and [contracts/auth-api.json](./contracts/auth-api.json).

---

## 1. Prerequisites & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Apply Database Migrations**:
   ```bash
   npm run db:migrate
   ```
   *Expected outcome*: Migration `002_auth_and_user_preferences` executes, creating `users`, `user_sessions`, and `user_preferences` tables and indexing foreign keys.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   *Expected outcome*: Backend starts on `http://localhost:3000` and Vite client serves on `http://localhost:5173`.

---

## 2. Validation Scenarios

### Scenario 1: User Registration & Initial Session (P1)
1. Navigate to `http://localhost:5173/` in a clean/incognito browser window.
2. Verify redirect to the authentication screen (`/login` or sign-in view).
3. Toggle to "Criar Conta" (Register tab).
4. Fill in:
   - **Nome**: `Ana Silva`
   - **Usuário**: `anasilva`
   - **E-mail**: `ana@exemplo.com`
   - **Senha**: `SenhaSegura123`
5. Submit form.
6. **Verification**:
   - Registration completes and user is immediately redirected to the Dashboard.
   - Top app bar displays user greeting/avatar ("Ana Silva" / "AS").
   - `localStorage` contains valid auth token.

### Scenario 2: Multi-User Data Isolation (P1/P3)
1. While logged in as `anasilva`, record an overtime entry:
   - Date: Today
   - Entry: `18:00`, Exit: `20:00` (2h overtime)
2. Tap user profile avatar in navigation and click **"Sair" (Logout)**.
3. Verify return to authentication screen.
4. Click "Criar Conta" and register a second user:
   - **Nome**: `Carlos Souza`
   - **Usuário**: `carlossouza`
   - **E-mail**: `carlos@exemplo.com`
   - **Senha**: `OutraSenha456`
5. Submit and land on Carlos's Dashboard.
6. **Verification**:
   - Carlos's overtime records list is completely empty.
   - Carlos's time bank balance is `0h 0m`.
   - None of Ana's data is visible.
7. Query database directly via SQLite CLI:
   ```bash
   sqlite3 data/minhashoras.db "SELECT user_id, net_overtime_minutes FROM overtime_records;"
   ```
   *Expected outcome*: Two different `user_id` values segregate the data rows.

### Scenario 3: Impeccable Theming & Dark/Light Switcher (P2)
1. Go to "Ajustes" (`/settings`).
2. Locate the "Aparência" (Appearance) section.
3. Tap **"Modo Claro" (Light)**:
   - Verify app background changes smoothly to `#f8fafc` without page reload.
   - Verify text changes to high-contrast dark slate (`#0f172a`).
   - Verify cards and borders display crisp `#e2e8f0` outlines.
4. Tap **"Modo Escuro" (Dark)**:
   - Verify background transitions to `#090d16`.
   - Verify surface cards transition to `#0f172a` and text to `#f8fafc`.
5. Tap **"Sistema" (Auto)**:
   - Verify app dynamically adapts when operating system appearance toggles.
6. Hard-refresh the page (`Ctrl+F5` / `Cmd+Shift+R`):
   - Verify NO white/dark flash (zero FOUC) occurs during page load.

### Scenario 4: Offline Session Continuity (P4)
1. Log into `anasilva`.
2. In browser DevTools -> **Network**, select **"Offline"** (simulating airplane mode).
3. Verify app bar indicator turns amber with badge **"Offline"**.
4. Navigate to "Registros" and create a 1-hour overtime entry (`18:00` to `19:00`).
5. **Verification**:
   - Record is saved instantly in local IndexedDB.
   - Record displays with status "Pendente de sincronização" (clock icon).
   - No blocking errors or modal dialogs appear.
6. In DevTools, restore network to **"Online"**.
7. **Verification**:
   - Sync service activates automatically.
   - Record status switches to "Sincronizado" (synced badge).
   - Server database reflects the new entry under Ana's `user_id`.

---

## 3. Automated Test Execution

Run the automated test suite covering authentication routes, token security, and migration checks:

```bash
npm run test
```

*Expected outcome*: All unit and contract tests in `server/tests/` and `client/` pass with zero failures.
