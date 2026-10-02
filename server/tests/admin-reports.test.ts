import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { RecordsRepository } from '../src/repositories/records-repository.js';
import { CompensationsRepository } from '../src/repositories/compensations-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { db } from '../src/db/connection.js';

describe('Admin Usage Reports & CSV Export Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();
  const recordsRepo = new RecordsRepository();
  const compRepo = new CompensationsRepository();

  let adminToken = '';
  let user1Id = 'report-user-1';
  let user2Id = 'report-user-2';

  beforeAll(async () => {
    runMigrations();

    userRepo.deleteUserByUsername('reportadmin');
    userRepo.deleteUserByUsername('reportuser1');
    userRepo.deleteUserByUsername('reportuser2');
    db.prepare("DELETE FROM overtime_records WHERE user_id IN ('report-user-1', 'report-user-2') OR id = 'ot-rec-1'").run();
    db.prepare("DELETE FROM compensation_schedules WHERE user_id IN ('report-user-1', 'report-user-2') OR id = 'comp-rec-1'").run();

    // Create Admin
    userRepo.createUser({
      id: 'report-admin-id',
      username: 'reportadmin',
      email: 'reportadmin@example.com',
      password_hash: AuthService.hashPassword('AdminPass123!'),
      display_name: 'Report Admin',
      role: 'admin',
      is_active: 1,
    });

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'reportadmin', password: 'AdminPass123!' },
    });
    adminToken = JSON.parse(adminLogin.payload).token;

    // Create 2 test users
    userRepo.createUser({
      id: user1Id,
      username: 'reportuser1',
      email: 'reportuser1@example.com',
      password_hash: AuthService.hashPassword('Pass123!'),
      display_name: 'Alice Reporter',
      role: 'user',
      is_active: 1,
    });

    userRepo.createUser({
      id: user2Id,
      username: 'reportuser2',
      email: 'reportuser2@example.com',
      password_hash: AuthService.hashPassword('Pass123!'),
      display_name: 'Bob Reporter',
      role: 'user',
      is_active: 1,
    });

    // Seed overtime and compensation records
    recordsRepo.create({
      id: 'ot-rec-1',
      user_id: user1Id,
      record_date: '2026-10-01',
      start_time: '08:00',
      end_time: '18:00',
      break_duration_minutes: 60, // 600 - 60 = 540 gross. Net depends on standard daily 480 => 60 net overtime
    });

    compRepo.create({
      id: 'comp-rec-1',
      user_id: user1Id,
      planned_date: '2026-10-02',
      scheduled_minutes: 30,
      actual_minutes: 30,
      status: 'Completed',
    });
  });

  it('GET /api/v1/admin/reports/usage returns consolidated statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports/usage',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.summary).toBeDefined();
    expect(body.summary.total_users).toBeGreaterThanOrEqual(3);
    expect(body.summary.active_users).toBeGreaterThanOrEqual(3);
    expect(body.summary.total_overtime_minutes).toBeGreaterThanOrEqual(60);
    expect(body.summary.total_compensation_minutes).toBeGreaterThanOrEqual(30);
    expect(body.summary.net_balance_minutes).toBe(
      body.summary.total_overtime_minutes - body.summary.total_compensation_minutes
    );

    expect(Array.isArray(body.users)).toBe(true);
    const alice = body.users.find((u: any) => u.username === 'reportuser1');
    expect(alice).toBeDefined();
    expect(alice.overtime_minutes).toBeGreaterThanOrEqual(60);
    expect(alice.compensation_minutes).toBe(30);
    expect(alice.entries_count).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/v1/admin/reports/usage/export downloads CSV with UTF-8 BOM', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports/usage/export',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');

    const csvText = res.payload;
    // Check BOM (\uFEFF)
    expect(csvText.charCodeAt(0)).toBe(0xFEFF);
    expect(csvText).toContain('RELATÓRIO CONSOLIDADO DE USO - MINHAS HORAS');
    expect(csvText).toContain('Alice Reporter');
    expect(csvText).toContain('reportuser1');
  });
});
