import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { db } from '../src/db/connection.js';

describe('Admin Access Auditing & Sessions Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let adminToken = '';
  let targetUserToken = '';
  let targetUserId = '';

  beforeAll(async () => {
    runMigrations();

    userRepo.deleteUserByUsername('auditoradmin');
    userRepo.deleteUserByUsername('audittarget');
    db.prepare("DELETE FROM access_audit_logs WHERE user_id IN ('audit-admin-id', 'audit-target-id')").run();
    db.prepare("DELETE FROM user_sessions WHERE user_id IN ('audit-admin-id', 'audit-target-id')").run();

    // Create Admin
    const admin = userRepo.createUser({
      id: 'audit-admin-id',
      username: 'auditoradmin',
      email: 'auditoradmin@example.com',
      password_hash: AuthService.hashPassword('AdminPass123!'),
      display_name: 'Auditor Admin',
      role: 'admin',
      is_active: 1,
    });

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'auditoradmin', password: 'AdminPass123!' },
    });
    adminToken = JSON.parse(adminLogin.payload).token;

    // Create Target User
    const target = userRepo.createUser({
      id: 'audit-target-id',
      username: 'audittarget',
      email: 'target@example.com',
      password_hash: AuthService.hashPassword('TargetPass123!'),
      display_name: 'Target User',
      role: 'user',
      is_active: 1,
    });
    targetUserId = target.id;

    const targetLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'audittarget', password: 'TargetPass123!' },
    });
    targetUserToken = JSON.parse(targetLogin.payload).token;
  });

  it('records login_success audit log on user login', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/access-logs?event_type=login_success',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.logs.length).toBeGreaterThan(0);
    expect(body.logs.some((l: any) => l.username === 'audittarget')).toBe(true);
  });

  it('supports pagination and search filtering in access logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/access-logs?search=audittarget&page=1&limit=5',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
    expect(body.logs.every((l: any) => l.username === 'audittarget')).toBe(true);
  });

  it('lists active sessions across users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sessions',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions.some((s: any) => s.username === 'audittarget')).toBe(true);
  });

  it('allows administrator to revoke a user session', async () => {
    // 1. Get session ID for audittarget
    const sessionsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sessions',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sessions = JSON.parse(sessionsRes.payload).sessions;
    const targetSession = sessions.find((s: any) => s.username === 'audittarget');
    expect(targetSession).toBeDefined();

    // 2. Revoke session
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/sessions/${targetSession.id}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(revokeRes.statusCode).toBe(200);

    // 3. Target user should now be rejected with 401 Unauthorized
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${targetUserToken}` },
    });
    expect(meRes.statusCode).toBe(401);
  });
});
