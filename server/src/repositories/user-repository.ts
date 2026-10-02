import { db } from '../db/connection.js';

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

export interface UserWithSessionsCount extends UserEntity {
  active_sessions_count: number;
}

export interface UserPreferencesEntity {
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system';
  daily_standard_work_minutes: number;
  max_positive_limit_minutes: number;
  max_negative_limit_minutes: number;
  warning_threshold_percentage: number;
  updated_at: string;
}

export class UserRepository {
  createUser(user: {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    display_name: string;
    role?: 'admin' | 'user';
    is_active?: number | boolean;
    must_change_password?: number | boolean;
  }): UserEntity {
    const now = new Date().toISOString();
    
    // If role is not explicitly provided, check if this is the first user
    let assignedRole = user.role;
    if (!assignedRole) {
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
      assignedRole = userCount === 0 ? 'admin' : 'user';
    }

    const isActiveVal = user.is_active !== undefined ? (user.is_active ? 1 : 0) : 1;
    const mustChangeVal = user.must_change_password !== undefined ? (user.must_change_password ? 1 : 0) : 0;

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, role, is_active, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      user.id,
      user.username.toLowerCase(),
      user.email.toLowerCase(),
      user.password_hash,
      user.display_name,
      assignedRole,
      isActiveVal,
      mustChangeVal,
      now,
      now
    );

    // Initialize default preferences
    this.upsertPreferences(user.id, {
      theme_mode: 'system',
      daily_standard_work_minutes: 480,
      max_positive_limit_minutes: 2400,
      max_negative_limit_minutes: -600,
      warning_threshold_percentage: 80
    });

    return this.findById(user.id)!;
  }

  findById(id: string): UserEntity | null {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return (row as UserEntity) || null;
  }

  findByUsername(username: string): UserEntity | null {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());
    return (row as UserEntity) || null;
  }

  findByEmail(email: string): UserEntity | null {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    return (row as UserEntity) || null;
  }

  findByLogin(login: string): UserEntity | null {
    const normalized = login.toLowerCase().trim();
    const row = db.prepare(`
      SELECT * FROM users 
      WHERE username = ? OR email = ?
    `).get(normalized, normalized);
    return (row as UserEntity) || null;
  }

  listAllUsers(): UserWithSessionsCount[] {
    const now = new Date().toISOString();
    const rows = db.prepare(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > ?) as active_sessions_count
      FROM users u
      ORDER BY u.created_at ASC
    `).all(now) as UserWithSessionsCount[];
    return rows;
  }

  updateUser(id: string, updates: {
    display_name?: string;
    email?: string;
    role?: 'admin' | 'user';
    is_active?: number | boolean;
    must_change_password?: number | boolean;
    password_hash?: string;
  }): UserEntity | null {
    const user = this.findById(id);
    if (!user) return null;

    const now = new Date().toISOString();
    const displayName = updates.display_name !== undefined ? updates.display_name : user.display_name;
    const email = updates.email !== undefined ? updates.email.toLowerCase() : user.email;
    const role = updates.role !== undefined ? updates.role : user.role;
    const isActive = updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : user.is_active;
    const mustChange = updates.must_change_password !== undefined
      ? (updates.must_change_password ? 1 : 0)
      : user.must_change_password;
    const passwordHash = updates.password_hash !== undefined ? updates.password_hash : user.password_hash;

    db.prepare(`
      UPDATE users
      SET display_name = ?,
          email = ?,
          role = ?,
          is_active = ?,
          must_change_password = ?,
          password_hash = ?,
          updated_at = ?
      WHERE id = ?
    `).run(displayName, email, role, isActive, mustChange, passwordHash, now, id);

    return this.findById(id);
  }

  updatePasswordAndClearFlag(userId: string, passwordHash: string): boolean {
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE users
      SET password_hash = ?,
          must_change_password = 0,
          updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, userId);

    return result.changes > 0;
  }

  countActiveAdmins(): number {
    const row = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1`).get() as { count: number };
    return row.count;
  }

  isSoleAdmin(userId: string): boolean {
    const user = this.findById(userId);
    if (!user || user.role !== 'admin' || user.is_active !== 1) {
      return false;
    }
    return this.countActiveAdmins() <= 1;
  }

  getPreferences(userId: string): UserPreferencesEntity | null {
    const row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    return (row as UserPreferencesEntity) || null;
  }

  upsertPreferences(userId: string, prefs: Partial<UserPreferencesEntity>): UserPreferencesEntity {
    const now = new Date().toISOString();
    const existing = this.getPreferences(userId);

    if (existing) {
      db.prepare(`
        UPDATE user_preferences
        SET theme_mode = COALESCE(?, theme_mode),
            daily_standard_work_minutes = COALESCE(?, daily_standard_work_minutes),
            max_positive_limit_minutes = COALESCE(?, max_positive_limit_minutes),
            max_negative_limit_minutes = COALESCE(?, max_negative_limit_minutes),
            warning_threshold_percentage = COALESCE(?, warning_threshold_percentage),
            updated_at = ?
        WHERE user_id = ?
      `).run(
        prefs.theme_mode ?? null,
        prefs.daily_standard_work_minutes ?? null,
        prefs.max_positive_limit_minutes ?? null,
        prefs.max_negative_limit_minutes ?? null,
        prefs.warning_threshold_percentage ?? null,
        now,
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO user_preferences (
          user_id, theme_mode, daily_standard_work_minutes,
          max_positive_limit_minutes, max_negative_limit_minutes,
          warning_threshold_percentage, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        prefs.theme_mode || 'system',
        prefs.daily_standard_work_minutes ?? 480,
        prefs.max_positive_limit_minutes ?? 2400,
        prefs.max_negative_limit_minutes ?? -600,
        prefs.warning_threshold_percentage ?? 80,
        now
      );
    }

    return this.getPreferences(userId)!;
  }

  deleteUser(id: string): void {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  deleteUserByUsername(username: string): void {
    const user = this.findByUsername(username);
    if (user) {
      this.deleteUser(user.id);
    }
  }

  deleteUserAndAllData(userId: string): void {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM overtime_records WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM compensation_schedules WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM time_bank_balance WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM time_bank_settings WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
      db.prepare('UPDATE access_audit_logs SET user_id = NULL WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });
    transaction();
  }
}
