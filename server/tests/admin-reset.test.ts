import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { db } from '../src/db/connection.js';
import fs from 'fs';
import path from 'path';

describe('Admin Factory Reset Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let adminToken = '';
  let standardToken = '';
  let adminId = '';
  let standardUserId = '';

  beforeAll(async () => {
    runMigrations();

    // Clean up test accounts
    userRepo.deleteUserByUsername('reset_admin');
    userRepo.deleteUserByUsername('reset_user');

    // Create an admin user
    const admin = userRepo.createUser({
      id: 'admin-reset-test-id',
      username: 'reset_admin',
      email: 'reset_admin@example.com',
      password_hash: AuthService.hashPassword('AdminPassword123!'),
      display_name: 'Reset Admin',
      role: 'admin',
      is_active: 1,
    });
    adminId = admin.id;

    // Login as admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'reset_admin', password: 'AdminPassword123!' },
    });
    adminToken = JSON.parse(adminLoginRes.payload).token;

    // Create a regular user
    const regularUser = userRepo.createUser({
      id: 'user-reset-test-id',
      username: 'reset_user',
      email: 'reset_user@example.com',
      password_hash: AuthService.hashPassword('UserPassword123!'),
      display_name: 'Reset Regular User',
      role: 'user',
      is_active: 1,
    });
    standardUserId = regularUser.id;

    // Login as regular user
    const userLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'reset_user', password: 'UserPassword123!' },
    });
    standardToken = JSON.parse(userLoginRes.payload).token;
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/system/reset',
      payload: { confirmation: 'ZERAR' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects non-admin requests with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/system/reset',
      headers: { authorization: `Bearer ${standardToken}` },
      payload: { confirmation: 'ZERAR' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects reset request if confirmation keyword does not match ZERAR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/system/reset',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { confirmation: 'CANCEL' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('ZERAR');
  });

  it('executes full database reset when confirmation keyword is ZERAR', async () => {
    // Insert dummy records to verify they are deleted
    db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time, break_duration_minutes, net_overtime_minutes, category, client_updated_at, created_at, updated_at
      ) VALUES ('dummy-ot-1', ?, '2026-10-01', '18:00', '20:00', 0, 120, 'standard', datetime('now'), datetime('now'), datetime('now'))
    `).run(standardUserId);

    // Seed dummy backup run and dummy file
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const testBackupFile = path.join(backupDir, 'test-reset-backup.sqlite');
    fs.writeFileSync(testBackupFile, 'dummy backup content');

    db.prepare(`
      INSERT INTO backup_runs (
        id, trigger_type, status, file_name, file_path, started_at, completed_at
      ) VALUES ('dummy-run-1', 'manual', 'completed', 'test-reset-backup.sqlite', ?, datetime('now'), datetime('now'))
    `).run(testBackupFile);

    // Call reset with ZERAR and deleteBackups: true
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/system/reset',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { confirmation: 'ZERAR', deleteBackups: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.epoch).toBeDefined();

    // Verify operational tables are wiped
    const otCount = (db.prepare('SELECT COUNT(*) as c FROM overtime_records').get() as any).c;
    expect(otCount).toBe(0);

    const compCount = (db.prepare('SELECT COUNT(*) as c FROM compensation_schedules').get() as any).c;
    expect(compCount).toBe(0);

    const backupRunsCount = (db.prepare('SELECT COUNT(*) as c FROM backup_runs').get() as any).c;
    expect(backupRunsCount).toBe(0);

    // Verify dummy backup file was deleted from disk
    expect(fs.existsSync(testBackupFile)).toBe(false);

    // Verify calling admin account is preserved
    const adminUser = userRepo.findById(adminId);
    expect(adminUser).toBeDefined();
    expect(adminUser?.username).toBe('reset_admin');

    // Verify non-admin user was removed
    const regularUser = userRepo.findById(standardUserId);
    expect(regularUser).toBeFalsy();

    // Verify single SYSTEM_RESET audit log exists
    const logs = db.prepare('SELECT * FROM access_audit_logs').all() as any[];
    expect(logs.length).toBe(1);
    expect(logs[0].event_type).toBe('SYSTEM_RESET');
  });

  afterAll(() => {
    userRepo.deleteUserByUsername('reset_admin');
    userRepo.deleteUserByUsername('reset_user');
  });
});
