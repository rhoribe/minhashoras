import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';
import { UserRepository } from '../../src/repositories/user-repository.js';
import { AuthService } from '../../src/services/auth-service.js';

describe('Reports API Contracts (US4 / Feature 012)', () => {
  const app = buildServer();
  const userRepo = new UserRepository();
  let authToken = '';

  beforeAll(async () => {
    runMigrations();

    const timestamp = Date.now();
    const username = `report_contract_${timestamp}`;
    userRepo.createUser({
      id: `usr-rep-${timestamp}`,
      username,
      email: `${username}@example.com`,
      password_hash: AuthService.hashPassword('ContractPass123!'),
      display_name: 'Report Contract User',
      role: 'user',
      is_active: 1,
      must_change_password: 0,
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: username, password: 'ContractPass123!' },
    });
    authToken = JSON.parse(loginRes.payload).token;
  });

  it('GET /api/v1/reports/export fails with 401 when token is missing', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/reports/export?format=csv returns CSV stream with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('Data,Entrada,Saida');
  });

  it('GET /api/v1/reports/export?format=xlsx returns Excel binary with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=xlsx&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('GET /api/v1/reports/export?format=pdf returns PDF binary with valid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=pdf&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('GET /api/v1/reports/export fails with 400 when format is invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=unknown&start_date=2026-10-01&end_date=2026-10-31',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
