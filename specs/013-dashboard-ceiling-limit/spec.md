# Feature Specification: Dynamic Positive Limit Ceiling on Dashboard

**Feature Branch**: `013-dashboard-ceiling-limit`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "ono painel esta aparecendo uso teto +40h isso tem que ser baseado no limite maximo posotivo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dynamic Ceiling Display & Progress Tracking Based on Configured Positive Limit (Priority: P1)

As an authenticated employee or manager, I want the dashboard balance card to display my actual configured maximum positive limit ("teto") instead of a static/hardcoded +40h value, so that the capacity progress bar and ceiling indicator accurately represent my personal or contractually defined overtime ceiling.

**Why this priority**: Displaying a hardcoded 40h ceiling misleads users whose overtime policies have different thresholds (e.g., 20h, 30h, 60h). An inaccurate ceiling causes erroneous perceptions of overtime headroom and false limit breach warnings.

**Independent Test**: Can be tested independently by logging in as a user, adjusting the "Limite Máximo Positivo" in Settings to a non-default value (e.g., 20 hours or 60 hours), saving, navigating to the dashboard, and verifying that the balance card reads "Uso do teto (+20h)" or "Uso do teto (+60h)" with the progress percentage and bar width calculated relative to that exact ceiling.

**Acceptance Scenarios**:

1. **Given** an authenticated user who configured a maximum positive limit of 20 hours (1200 minutes) in Settings, **When** they view the dashboard, **Then** the balance card displays "Uso do teto (+20h)" and the progress percentage is computed as `(net_balance / 1200) * 100`.
2. **Given** an authenticated user who modifies their maximum positive limit from 40h to 60h, **When** they save settings and return to the dashboard, **Then** the dashboard ceiling indicator immediately displays "Uso do teto (+60h)" and the capacity bar recalculates without requiring a page refresh or logout.
3. **Given** a newly registered user who has not modified settings, **When** they access the dashboard, **Then** the default ceiling of 40h (2400 minutes) is displayed until customized.
4. **Given** a user with positive overtime accumulated, **When** the net balance approaches the configured percentage (e.g., 80% of the custom ceiling), **Then** the warning banner and progress bar colors adjust relative to the user's custom ceiling.

---

### User Story 2 - Offline-First Persistence & Consistency of Limit Settings (Priority: P2)

As a mobile user in an offline environment, I want my configured time bank limits to be cached in the client-side database (IndexedDB), so that when I open the app without an internet connection, the dashboard continues to display and compute my customized ceiling and limit warnings accurately.

**Why this priority**: Minhas Horas is an offline-first PWA. If settings are not cached locally, an offline launch would revert the dashboard to default assumptions (40h), causing inconsistent UI states between offline and online usage.

**Independent Test**: Set a custom positive limit while connected, disconnect network access (offline/airplane mode), reload the dashboard, and verify that the card continues to show the customized ceiling value and calculates usage percentages correctly.

**Acceptance Scenarios**:

1. **Given** a user who saved a custom positive limit while online, **When** they access the dashboard while offline, **Then** the dashboard retrieves the cached limit preferences from local IndexedDB and displays the correct custom ceiling.
2. **Given** an authenticated user who modifies settings while offline, **When** they return to the dashboard, **Then** the local balance service immediately reflects the new limits and enqueues a sync item for when connectivity is restored.
3. **Given** multiple user accounts sharing a device, **When** a user logs out and another user logs in, **Then** the dashboard isolates and displays the newly authenticated user's specific ceiling settings.

---

### Edge Cases

- **Non-Standard Minute Durations**: If a user's positive limit is configured in non-hourly increments (e.g., 1230 minutes = 20h 30m), the display formats cleanly (e.g., "+20h 30m" or rounded to the nearest integer hour) without visual truncation or `NaN` errors.
- **Zero or Negative Net Balance**: When the user has zero hours or a negative balance (in deficit), the ceiling usage percentage must be displayed as 0% and the progress bar width must remain at 0%, preventing negative widths or reverse progress bars.
- **Net Balance Exceeding Ceiling**: If the accumulated overtime exceeds 100% of the positive limit, the percentage indicator accurately reflects the overage (e.g., "115%"), the bar fills to 100%, and the critical exceeded warning state is applied.
- **Unreachable Server / First Load Offline**: If the server is unreachable during initial session bootstrapping, the system gracefully falls back to the standard 40h default without crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST dynamically display the dashboard ceiling indicator ("Uso do teto") using the active user's configured maximum positive limit (`max_positive_limit_minutes`).
- **FR-002**: System MUST calculate the dashboard capacity progress percentage as `(net_balance_minutes / max_positive_limit_minutes) * 100` (clamped to 0% minimum when balance <= 0).
- **FR-003**: System MUST persist user time bank settings (`max_positive_limit_minutes`, `max_negative_limit_minutes`, `warning_threshold_percentage`, `daily_standard_work_minutes`) in client-side storage (`localDb.preferences`) keyed by user ID.
- **FR-004**: Client-side balance calculation service (`calculateLocalBalance`) MUST load the active user's stored preferences to determine the positive limit, negative limit, and warning threshold.
- **FR-005**: Dashboard view MUST update its displayed balance and ceiling parameters immediately upon returning from the Settings screen or completing a background sync.
- **FR-006**: Limit alert banners (`LimitAlertBanner`) on the dashboard MUST evaluate warning and exceeded thresholds against the user's custom maximum positive limit and warning percentage.
- **FR-007**: Server balance calculation (`recalculateBalance`) and client balance calculation (`calculateLocalBalance`) MUST use identical logic and settings sources for threshold evaluation.

### Key Entities *(include if feature involves data)*

- **TimeBankSettings**: Represents a user's balance boundaries and alerts. Key attributes include:
  - `user_id`: Unique identifier of the user.
  - `max_positive_limit_minutes`: Upper ceiling for positive banked overtime (default: 2400 minutes / 40h).
  - `max_negative_limit_minutes`: Lower threshold for negative deficit hours (default: -600 minutes / -10h).
  - `warning_threshold_percentage`: Trigger point (percentage of ceiling) for preventive alert banners (default: 80%).
- **BalanceSummary**: Aggregated balance status containing net accumulated minutes, projected minutes, usage percentage, warning flag, and the associated active limit settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of dashboard sessions display the ceiling indicator matching the user's configured positive limit instead of a static 40h default.
- **SC-002**: Modifications to the maximum positive limit in Settings take effect on the dashboard in under 1 second without full application reload.
- **SC-003**: 100% of offline dashboard calculations use the locally cached custom positive limit.
- **SC-004**: Zero discrepancy between the ceiling value configured in Settings, the value shown on the Dashboard card, and the threshold triggering the Limit Alert Banner.

## Assumptions

- The default positive limit for new users or unconfigured accounts remains 40 hours (2400 minutes).
- In the user interface, limits are entered and configured in whole hours in Settings, but stored internally as minutes for precision.
- The existing synchronization infrastructure handles propagating settings changes to the server database.
