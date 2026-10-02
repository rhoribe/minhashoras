import { db } from '../db/connection.js';

export interface SessionEntity {
  id: string;
  user_id: string;
  token: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export interface ActiveSessionWithUser {
  id: string;
  user_id: string;
  token: string;
  username: string;
  display_name: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export class SessionRepository {
  createSession(session: {
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    user_agent?: string | null;
    ip_address?: string | null;
  }): SessionEntity {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_sessions (
        id, user_id, token, user_agent, ip_address, expires_at, created_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.user_id,
      session.token,
      session.user_agent || null,
      session.ip_address || null,
      session.expires_at,
      now,
      now
    );

    return this.findByToken(session.token)!;
  }

  findByToken(token: string): SessionEntity | null {
    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT * FROM user_sessions 
      WHERE token = ? AND expires_at > ?
    `).get(token, now);

    return (row as SessionEntity) || null;
  }

  findById(id: string): SessionEntity | null {
    const row = db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(id);
    return (row as SessionEntity) || null;
  }

  listAllActiveSessions(): ActiveSessionWithUser[] {
    const now = new Date().toISOString();
    const rows = db.prepare(`
      SELECT 
        s.id,
        s.user_id,
        s.token,
        u.username,
        u.display_name,
        s.user_agent,
        s.ip_address,
        s.expires_at,
        s.created_at,
        s.last_used_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > ?
      ORDER BY s.last_used_at DESC
    `).all(now) as ActiveSessionWithUser[];
    return rows;
  }

  touchSession(token: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE user_sessions
      SET last_used_at = ?
      WHERE token = ?
    `).run(now, token);
  }

  deleteSession(token: string): boolean {
    const result = db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
    return result.changes > 0;
  }

  deleteSessionById(id: string): boolean {
    const result = db.prepare('DELETE FROM user_sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  deleteUserSessions(userId: string): void {
    db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  }

  cleanupExpiredSessions(): void {
    const now = new Date().toISOString();
    db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?').run(now);
  }
}
