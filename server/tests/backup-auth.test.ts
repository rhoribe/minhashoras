import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { backupRepository } from '../src/repositories/backup-repository.js';

describe('Feature 012: Backup Authentication Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let adminToken = '';
  let adminId = '';
  let standardToken = '';
  let standardId = '';

  const timestamp = Date.now();
  const adminName = `bkp_adm_${timestamp}`;
  const standardName = `bkp_std_${timestamp}`;

  beforeAll(async () => {
    runMigrations();
    backupRepository.cleanupOrphanRuns();

    // Create Admin
    const admin = userRepo.createUser({
      id: `bkp-adm-${timestamp}`,
      username: adminName,
      email: `${adminName}@example.com`,
      password_hash: AuthService.hashPassword('AdminPass123!'),
      display_name: 'Backup Admin',
      role: 'admin',
      is_active: 1,
      must_change_password: 0,
    });
    adminId = admin.id;

    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: adminName, password: 'AdminPass123!' },
    });
    adminToken = JSON.parse(adminLoginRes.payload).token;

    // Create Standard User
    const std = userRepo.createUser({
      id: `bkp-std-${timestamp}`,
      username: standardName,
      email: `${standardName}@example.com`,
      password_hash: AuthService.hashPassword('StandardPass123!'),
      display_name: 'Standard User',
      role: 'user',
      is_active: 1,
      must_change_password: 0,
    });
    standardId = std.id;

    const stdLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: standardName, password: 'StandardPass123!' },
    });
    standardToken = JSON.parse(stdLoginRes.payload).token;
  });

  it('rejects manual backup export without token with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/export',
      payload: {},
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('Token de autenticação não fornecido');
  });

  it('rejects manual backup export from standard user with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/export',
      headers: {
        authorization: `Bearer ${standardToken}`,
      },
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('restrito a administradores');
  });

  it('allows manual backup export from authenticated admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/export',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    expect([200, 201, 202]).toContain(res.statusCode);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('completed');
    expect(body.triggerType).toBe('manual');
    expect(body.fileName).toBeDefined();
  });

  it('allows fetching backup schedule with admin token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/schedule',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.frequency).toBeDefined();
  });

  it('allows updating backup schedule with admin token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/backups/schedule',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        enabled: true,
        frequency: 'weekly',
        timeOfDay: '03:00',
        dayOfWeek: 1,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.frequency).toBe('weekly');
    expect(body.timeOfDay).toBe('03:00');
  });

  it('allows fetching backup status and history with admin token', async () => {
    const statusRes = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/status',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(statusRes.statusCode).toBe(200);

    const historyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/history',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(historyRes.statusCode).toBe(200);
    const historyBody = JSON.parse(historyRes.payload);
    expect(historyBody.runs).toBeInstanceOf(Array);
  });
});
