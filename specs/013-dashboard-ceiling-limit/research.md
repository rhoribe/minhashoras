# Phase 0 Research: Dynamic Positive Limit Ceiling on Dashboard

## Technical Decisions & Findings

### Decision 1: Offline-First Persistence for User Time Bank Settings

- **Decision**: Store user-specific time bank settings directly in `localDb.preferences` in IndexedDB, keyed by `user_id`.
- **Rationale**:
  - Aligns with **Constitution Principle II (Offline-First Operation & Deterministic Sync)**.
  - When the app is launched offline, `calculateLocalBalance()` must not fall back to a hardcoded 40h constant if the user previously customized their positive ceiling limit.
  - The `localDb.preferences` table already exists in schema version 2 (`preferences: 'user_id, theme_mode'`) and can store `max_positive_limit_minutes`, `max_negative_limit_minutes`, `warning_threshold_percentage`, and `daily_standard_work_minutes`.
- **Alternatives Considered**:
  - *Browser `localStorage`*: Rejected because `localDb` (Dexie.js) is the centralized, reactive client database used across the entire application, and multi-user device switching is cleaner in IndexedDB.
  - *Network-only API calls on dashboard render*: Rejected because it introduces latency, fails completely when offline, and degrades dashboard rendering speed.

---

### Decision 2: Retrieval Strategy in `calculateLocalBalance()`

- **Decision**:
  1. Retrieve active user ID via `getCurrentUserId()`.
  2. Query `await localDb.preferences.get(userId)`.
  3. If found and `max_positive_limit_minutes` is defined, use that value (e.g. 1200, 3600), along with custom `max_negative_limit_minutes` and `warning_threshold_percentage`.
  4. If not found in IndexedDB, default to 2400 (+40h), -600 (-10h), and 80%, while scheduling a background fetch from `/api/v1/settings` to populate local cache.
- **Rationale**:
  - Zero UI blocking on network latency.
  - Guarantees immediate response with 100% offline resilience.
- **Alternatives Considered**:
  - *Awaiting `/api/v1/settings` on every calculation*: Rejected because `calculateLocalBalance()` is called during sync, on mount, and during record operations where network requests would create unnecessary overhead and break offline operation.

---

### Decision 3: Bi-Directional Synchronization in Settings and Sync Manager

- **Decision**:
  - In `SettingsView.vue`:
    - When `loadSettings()` succeeds, cache the fetched settings in `localDb.preferences`.
    - When `saveSettings()` succeeds, immediately update `localDb.preferences`. If offline, enqueue an update in `syncQueue` (or keep local preference until online).
  - In `sync.ts` (`SyncManager.pullFromServer()`):
    - Include a fetch to `/api/v1/settings` using active credentials and write the settings into `localDb.preferences`.
- **Rationale**:
  - Ensures immediate consistency: when a user changes settings from 40h to 20h in `SettingsView` and clicks back to `DashboardView`, the ceiling reflects `+20h` immediately without needing a hard reload.
- **Alternatives Considered**:
  - *Only syncing settings during initial login*: Rejected because users can change their limits at any time during an active session.

---

### Decision 4: Ceiling Formatting & Calculation in `BalanceCard.vue`

- **Decision**:
  - Compute a friendly ceiling string:
    - If `maxMinutes % 60 === 0`, display `+${maxMinutes / 60}h` (e.g., `+20h`, `+60h`).
    - If `maxMinutes % 60 !== 0`, display `+${Math.floor(maxMinutes / 60)}h ${maxMinutes % 60}m`.
  - Calculate `usagePercentage`:
    - If `maxMinutes <= 0`, return 0.
    - If `netMinutes <= 0`, return 0% (prevent negative percentages).
    - If `netMinutes > 0`, return `Math.round((netMinutes / maxMinutes) * 100)`.
    - Progress bar width style clamps visually between 0% and 100%, while percentage text can show > 100% when overloaded.
- **Rationale**:
  - Directly resolves the user issue where the dashboard was frozen at `+40h`.
  - Guarantees clean, intuitive visual feedback regardless of the configured limit value.
- **Alternatives Considered**:
  - *Always showing decimal hours (e.g. +20.5h)*: Minutes format (`+20h 30m`) matches the rest of the application's time formatting convention.
