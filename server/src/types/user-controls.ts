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

export interface ChangePasswordRequest {
  current_password?: string;
  new_password: string;
}
