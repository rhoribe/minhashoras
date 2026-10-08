# Contracts: Dynamic Dashboard Ceiling and Balance Settings

## 1. Client Service Contract: `calculateLocalBalance()`

**Location**: `client/src/services/balance-service.ts`

```typescript
export async function calculateLocalBalance(): Promise<LocalBalanceSummary>;
```

### Output Specification

```typescript
export interface LocalBalanceSummary {
  totalPositiveMinutes: number;
  totalNegativeMinutes: number;
  netBalanceMinutes: number;
  projectedBalanceMinutes: number;
  isWarning: boolean;
  isExceeded: boolean;
  maxPositiveLimitMinutes: number;     // Dynamically resolved from localDb.preferences
  maxNegativeLimitMinutes: number;     // Dynamically resolved from localDb.preferences
  warningThresholdPercentage: number;  // Dynamically resolved from localDb.preferences
}
```

### Preconditions & Guarantees
- **Precondition**: `getCurrentUserId()` returns the active authenticated user's ID.
- **Guarantee 1**: If user preferences exist in `localDb.preferences` with `max_positive_limit_minutes`, that exact value is returned as `maxPositiveLimitMinutes`.
- **Guarantee 2**: If no preferences record is cached locally, fallback values (2400 mins / 40h, -600 mins / -10h, 80%) are returned without throwing errors.
- **Guarantee 3**: `isWarning` is `true` if and only if `netBalanceMinutes >= (maxPositiveLimitMinutes * warningThresholdPercentage / 100)` and `netBalanceMinutes < maxPositiveLimitMinutes`.
- **Guarantee 4**: `isExceeded` is `true` if and only if `netBalanceMinutes >= maxPositiveLimitMinutes`.

---

## 2. Component Interface Contract: `BalanceCard.vue`

**Location**: `client/src/components/balance/BalanceCard.vue`

### Props Contract

```typescript
defineProps<{
  positiveMinutes: number;
  negativeMinutes: number;
  netMinutes: number;
  projectedMinutes: number;
  maxMinutes: number; // Configured maximum positive limit in minutes
}>();
```

### Visual Output Rules

| Input `maxMinutes` | Input `netMinutes` | Rendered Ceiling Text | Progress Bar Width | Progress % Text |
|---|---|---|---|---|
| `2400` (40h) | `1200` (20h) | `Uso do teto (+40h)` | `50%` | `50%` |
| `1200` (20h) | `600` (10h) | `Uso do teto (+20h)` | `50%` | `50%` |
| `3600` (60h) | `900` (15h) | `Uso do teto (+60h)` | `25%` | `25%` |
| `1530` (25h 30m) | `0` | `Uso do teto (+25h 30m)` | `0%` | `0%` |
| `1200` (20h) | `-120` (-2h) | `Uso do teto (+20h)` | `0%` | `0%` |
| `1200` (20h) | `1440` (24h) | `Uso do teto (+20h)` | `100%` | `120%` |

---

## 3. REST API Contract: Settings Endpoints

### GET `/api/v1/settings`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`
```json
{
  "id": "default_settings_user_123",
  "user_id": "user_123",
  "max_positive_limit_minutes": 1800,
  "max_negative_limit_minutes": -600,
  "warning_threshold_percentage": 80,
  "daily_standard_work_minutes": 480,
  "notifications_enabled": 1,
  "daily_reminder_time": "18:00",
  "updated_at": "2026-10-02T18:00:00.000Z"
}
```

### PUT `/api/v1/settings`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "max_positive_limit_minutes": 1800,
  "max_negative_limit_minutes": -600,
  "warning_threshold_percentage": 80
}
```
- **Response**: `200 OK` with updated `TimeBankSettingsEntity`.
