# Data Model: User-Scoped Backups, Self-Service Password Change, and Personal Data Controls

## 1. DTOs & Export Schemas

### 1.1 `PersonalBackupArchive` Schema (Export Format)

When a standard or admin user invokes "Baixar Meu Backup Pessoal", the server produces a self-contained JSON document:

```typescript
export interface PersonalBackupArchive {
  metadata: {
    format_version: '1.0';
    app: 'Minhas Horas';
    exported_at: string; // ISO 8601
  };
  user: {
    id: string;
    username: string;
    email: string;
    display_name: string;
    role: 'admin' | 'user';
    created_at: string;
  };
  preferences: {
    theme_mode: 'light' | 'dark' | 'system';
    daily_standard_work_minutes: number;
    max_positive_limit_minutes: number;
    max_negative_limit_minutes: number;
    warning_threshold_percentage: number;
  } | null;
  balance_summary: {
    total_positive_minutes: number;
    total_negative_minutes: number;
    net_balance_minutes: number;
    projected_balance_minutes: number;
    last_calculated_at: string;
  } | null;
  records: Array<{
    id: string;
    record_date: string;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    net_overtime_minutes: number;
    description: string | null;
    category: string;
    created_at: string;
    updated_at: string;
  }>;
  compensations: Array<{
    id: string;
    planned_date: string;
    scheduled_minutes: number;
    actual_minutes: number | null;
    status: 'Scheduled' | 'Completed' | 'Cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>;
}
```

---

### 1.2 `ChangePasswordRequest` DTO Update

```typescript
export interface ChangePasswordRequest {
  current_password?: string; // Required when must_change_password === 0
  new_password: string;
}
```

---

### 1.3 `ResetUserRecordsRequest` DTO

```typescript
export interface ResetUserRecordsRequest {
  confirmation: 'ZERAR-MEUS-REGISTROS';
}

export interface ResetUserRecordsResponse {
  success: boolean;
  message: string;
  purgedRecordsCount: number;
  purgedCompensationsCount: number;
  resetAt: string;
}
```

---

## 2. State Transitions

### 2.1 Voluntary Password Change Flow

```
[ User in SettingsView -> Click "Alterar Senha" ]
                     │
                     ▼
          [ Enter Form Inputs ]
      - current_password (validated)
      - new_password (min 8 chars, letter+number)
      - confirm_password (matches new)
                     │
                     ▼ Submit
[ POST /api/v1/auth/change-password ]
                     │
         Verify current_password?
         ├── Incorrect -> 400 Bad Request
         └── Correct ->
                 │
                 ├─ Hash new_password via scrypt
                 ├─ UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
                 ├─ Invalidate other active sessions for user
                 ├─ INSERT audit log: PASSWORD_CHANGED
                 └─ Return 200 OK -> Toast success feedback
```

### 2.2 Personal Records Reset Flow (*Zerar Registros Pessoais*)

```
[ User in SettingsView -> Click "Zerar Meus Registros" ]
                     │
                     ▼
         [ Open Confirmation Modal ]
    "Zerar apenas horas e compensações?
     Sua conta de acesso continuará ativa."
                     │
                     ▼ User Confirms
[ POST /api/v1/user/reset-records ]
                     │
            Confirmation === "ZERAR-MEUS-REGISTROS"
                     │
                     ▼ Atomic SQLite Transaction
           ├─ DELETE FROM overtime_records WHERE user_id = ?
           ├─ DELETE FROM compensation_schedules WHERE user_id = ?
           ├─ UPDATE time_bank_balance SET total_positive_minutes = 0,
           │     total_negative_minutes = 0, net_balance_minutes = 0,
           │     projected_balance_minutes = 0 WHERE user_id = ?
           ├─ INSERT audit log: USER_RECORDS_RESET
           └─ 200 OK
                     │
                     ▼ Client Processing
           ├─ Clear Dexie IndexedDB records for user_id
           ├─ Reset in-memory balance to 0
           └─ Display success notification
```

### 2.3 Personal Data Export Flow (*Backup Pessoal*)

```
[ User in SettingsView -> Click "Baixar Meu Backup Pessoal" ]
                     │
                     ▼
[ GET /api/v1/user/export-backup ]
                     │
           Extract User-Scoped Entities:
           - User profile (no password_hash)
           - Preferences
           - Balance summary
           - All records where user_id = :current_user
           - All compensations where user_id = :current_user
                     │
                     ▼
   Generate filename: minhashoras-backup-<username>-<YYYY-MM-DD>.json
   Headers: Content-Type: application/json
            Content-Disposition: attachment; filename="..."
                     │
                     ▼
       Browser initiates direct file download
```
