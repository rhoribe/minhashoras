import Database from 'better-sqlite3';
import { AuthService } from '../../services/auth-service.js';

export function up(db: Database.Database): void {
  // Check existing columns in users table
  const columns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));

  if (!columnNames.has('must_change_password')) {
    db.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;`);
  }

  // Seed default admin account if no user with username 'admin' exists
  const existingAdmin = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get();
  if (!existingAdmin) {
    const passwordHash = AuthService.hashPassword('admin123');
    const now = new Date().toISOString();
    const adminId = 'default_admin_id';

    db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash, display_name, role, is_active, must_change_password, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin',
      'admin@local.internal',
      passwordHash,
      'Administrador',
      'admin',
      1,
      1, // must_change_password = 1 (mandatory password change on first access)
      now,
      now
    );

    // Initialize default preferences for default admin if not already present
    db.prepare(`
      INSERT OR IGNORE INTO user_preferences (
        user_id, theme_mode, daily_standard_work_minutes,
        max_positive_limit_minutes, max_negative_limit_minutes,
        warning_threshold_percentage, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, 'system', 480, 2400, -600, 80, now);
  }
}
