import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overtime_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      record_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_duration_minutes INTEGER NOT NULL DEFAULT 0,
      net_overtime_minutes INTEGER NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'standard',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      client_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_user_date ON overtime_records(user_id, record_date);

    CREATE TABLE IF NOT EXISTS compensation_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      planned_date TEXT NOT NULL,
      scheduled_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      notes TEXT,
      client_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_compensations_user_date ON compensation_schedules(user_id, planned_date);

    CREATE TABLE IF NOT EXISTS time_bank_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      max_positive_limit_minutes INTEGER NOT NULL DEFAULT 2400,
      max_negative_limit_minutes INTEGER NOT NULL DEFAULT -600,
      warning_threshold_percentage INTEGER NOT NULL DEFAULT 80,
      daily_standard_work_minutes INTEGER NOT NULL DEFAULT 480,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      daily_reminder_time TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_bank_balance (
      user_id TEXT PRIMARY KEY,
      total_positive_minutes INTEGER NOT NULL DEFAULT 0,
      total_negative_minutes INTEGER NOT NULL DEFAULT 0,
      net_balance_minutes INTEGER NOT NULL DEFAULT 0,
      projected_balance_minutes INTEGER NOT NULL DEFAULT 0,
      last_calculated_at TEXT NOT NULL
    );

    -- Insert default settings and balance for default_user if not exists
    INSERT OR IGNORE INTO time_bank_settings (
      id, user_id, max_positive_limit_minutes, max_negative_limit_minutes,
      warning_threshold_percentage, daily_standard_work_minutes,
      notifications_enabled, daily_reminder_time, updated_at
    ) VALUES (
      'default_settings_id', 'default_user', 2400, -600, 80, 480, 1, '18:00', datetime('now')
    );

    INSERT OR IGNORE INTO time_bank_balance (
      user_id, total_positive_minutes, total_negative_minutes,
      net_balance_minutes, projected_balance_minutes, last_calculated_at
    ) VALUES (
      'default_user', 0, 0, 0, 0, datetime('now')
    );
  `);
}
