# Data Model: Default Admin Bootstrap & User Self-Service Deletion

## Schema Changes

### `users` Table Extension

| Column | Type | Constraints | Description |
|---|---|---|---|
| `must_change_password` | `INTEGER` | `NOT NULL DEFAULT 0` | 1 if user must change password before accessing dashboard, 0 otherwise |

### Seed Entity: Default Administrator

```json
{
  "id": "default_admin_id",
  "username": "admin",
  "email": "admin@local",
  "display_name": "Administrador",
  "role": "admin",
  "is_active": 1,
  "must_change_password": 1
}
```

---

## DTOs & Contracts

### 1. `ChangePasswordRequest`

```typescript
export interface ChangePasswordRequest {
  new_password: string;
}
```

### 2. `DeleteAccountRequest`

```typescript
export interface DeleteAccountRequest {
  confirmation?: string;
}
```

### 3. `AuthUserDto` / `UserEntity` Updated

```typescript
export interface UserEntity {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'admin' | 'user';
  is_active: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}
```

---

## State Transitions

### Mandatory Password Change Lifecycle

```
[ Login with 'admin' / 'admin123' ]
             │
             ▼
     must_change_password === 1
             │
             ▼
[ Redirect to /change-password ]
             │
      Submit new_password
             │
             ▼
[ Validate & Hash Password ]
             │
             ├─ Update password_hash in DB
             ├─ Set must_change_password = 0
             └─ Insert audit log: PASSWORD_CHANGED
             │
             ▼
[ Granted Full Access -> Redirect to / ]
```

### Self-Service Account Deletion Lifecycle

```
[ User in SettingsView -> Click 'Excluir Minha Conta' ]
             │
             ▼
   [ Open Confirmation Modal ]
             │
             ▼ User Confirms
[ DELETE /api/v1/auth/me ]
             │
             ├─ Sole Admin Check: If sole active admin, reject (400)
             │
             └─ Atomic SQLite Transaction:
                  ├─ DELETE FROM overtime_records WHERE user_id = ?
                  ├─ DELETE FROM compensation_schedules WHERE user_id = ?
                  ├─ DELETE FROM time_bank_balance WHERE user_id = ?
                  ├─ DELETE FROM time_bank_settings WHERE user_id = ?
                  ├─ DELETE FROM user_preferences WHERE user_id = ?
                  ├─ DELETE FROM user_sessions WHERE user_id = ?
                  └─ DELETE FROM users WHERE id = ?
             │
             ▼ 200 OK
[ Client: clearAllLocalData() + localStorage.clear() ]
             │
             ▼
     [ Redirect to /login ]
```
