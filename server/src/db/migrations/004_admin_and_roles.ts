import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  // Check existing columns in users table
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));

  if (!columnNames.has('role')) {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`);
  }

  if (!columnNames.has('is_active')) {
    db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
  }

  // Ensure all existing users are upgraded to admin so the instance owner is never locked out
  db.exec(`UPDATE users SET role = 'admin' WHERE role = 'user';`);

  // Create access_audit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON access_audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_user_id ON access_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON access_audit_logs(event_type);
  `);
}
