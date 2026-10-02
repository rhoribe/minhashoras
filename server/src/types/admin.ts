export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_sessions_count: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  display_name: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  display_name?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface ResetPasswordRequest {
  new_password: string;
}

export interface AccessAuditLogDto {
  id: string;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminActiveSessionDto {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  is_current_session: boolean;
}

export interface SystemUsageMetricsDto {
  summary: {
    total_users: number;
    active_users: number;
    total_overtime_minutes: number;
    total_compensation_minutes: number;
    net_balance_minutes: number;
    total_entries_count: number;
  };
  users: Array<{
    user_id: string;
    username: string;
    display_name: string;
    role: 'admin' | 'user';
    is_active: boolean;
    overtime_minutes: number;
    compensation_minutes: number;
    net_balance_minutes: number;
    entries_count: number;
    last_entry_date: string | null;
  }>;
}

export interface SystemResetRequest {
  confirmation: string;
  deleteBackups?: boolean;
}

export interface SystemResetResult {
  success: boolean;
  message: string;
  wipedRecordsCount: number;
  wipedBackupsCount: number;
  epoch: string;
  resetAt: string;
}
