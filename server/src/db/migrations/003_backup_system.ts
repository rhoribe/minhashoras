import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS backup_schedules (
      id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'daily',
      time_of_day TEXT NOT NULL DEFAULT '02:00',
      day_of_week INTEGER DEFAULT 0,
      day_of_month INTEGER DEFAULT 1,
      retention_count INTEGER NOT NULL DEFAULT 7,
      target_directory TEXT,
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_runs (
      id TEXT PRIMARY KEY,
      schedule_id TEXT,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      file_name TEXT,
      file_path TEXT,
      file_size_bytes INTEGER,
      checksum_sha256 TEXT,
      records_count INTEGER,
      error_message TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (schedule_id) REFERENCES backup_schedules(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_backup_runs_status ON backup_runs(status);
    CREATE INDEX IF NOT EXISTS idx_backup_runs_started_at ON backup_runs(started_at DESC);

    INSERT OR IGNORE INTO backup_schedules (
      id, enabled, frequency, time_of_day, day_of_week, day_of_month, retention_count, created_at, updated_at
    ) VALUES (
      'default', 0, 'daily', '02:00', 0, 1, 7, datetime('now'), datetime('now')
    );
  `);
}
