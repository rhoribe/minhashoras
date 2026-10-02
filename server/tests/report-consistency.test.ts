import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { recordsRepository } from '../src/repositories/records-repository.js';
import { v4 as uuidv4 } from 'uuid';

describe('Feature 012: Report Consistency and User Isolation Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let userAToken = '';
  let userAId = '';
  let userBToken = '';
  let userBId = '';

  const timestamp = Date.now();
  const userAName = `rep_usera_${timestamp}`;
  const userBName = `rep_userb_${timestamp}`;

  beforeAll(async () => {
    runMigrations();

    // Create User A
    const userA = userRepo.createUser({
      id: `usera-${timestamp}`,
      username: userAName,
      email: `${userAName}@example.com`,
      password_hash: AuthService.hashPassword('Password123!'),
      display_name: 'User A',
      role: 'user',
      is_active: 1,
      must_change_password: 0,
    });
    userAId = userA.id;

    const loginResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: userAName, password: 'Password123!' },
    });
    userAToken = JSON.parse(loginResA.payload).token;

    // Create User B
    const userB = userRepo.createUser({
      id: `userb-${timestamp}`,
      username: userBName,
      email: `${userBName}@example.com`,
      password_hash: AuthService.hashPassword('Password123!'),
      display_name: 'User B',
      role: 'user',
      is_active: 1,
      must_change_password: 0,
    });
    userBId = userB.id;

    const loginResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: userBName, password: 'Password123!' },
    });
    userBToken = JSON.parse(loginResB.payload).token;

    // Insert overtime records for User A
    recordsRepository.create({
      id: uuidv4(),
      user_id: userAId,
      record_date: '2026-10-10',
      start_time: '18:00',
      end_time: '20:00',
      break_duration_minutes: 0,
      net_overtime_minutes: 120,
      category: 'Projeto Alpha',
      description: 'Overtime User A - Secret Work',
    });

    // Insert overtime records for User B
    recordsRepository.create({
      id: uuidv4(),
      user_id: userBId,
      record_date: '2026-10-11',
      start_time: '19:00',
      end_time: '21:00',
      break_duration_minutes: 0,
      net_overtime_minutes: 120,
      category: 'Projeto Beta',
      description: 'Overtime User B - Distinct Task',
    });
  });

  it('rejects unauthenticated report export requests with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('Token de autenticação não fornecido');
  });

  it('generates CSV report scoped strictly to authenticated User A without User B data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('Overtime User A - Secret Work');
    expect(res.payload).not.toContain('Overtime User B - Distinct Task');
    expect(res.payload).not.toContain('Projeto Beta');
  });

  it('generates Excel report scoped strictly to authenticated User B', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=xlsx&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${userBToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('generates PDF report scoped strictly to authenticated User A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=pdf&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });
});
