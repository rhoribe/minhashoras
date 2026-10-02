import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { v4 as uuidv4 } from 'uuid';

describe('Multi-User Data Isolation Integration Tests', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  let tokenA = '';
  let userAId = '';
  let tokenB = '';
  let userBId = '';

  it('creates two distinct users (User A and User B)', async () => {
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'usera_' + Date.now(),
        email: `usera_${Date.now()}@example.com`,
        password: 'Password123',
        display_name: 'User A',
      },
    });
    expect(resA.statusCode).toBe(201);
    const bodyA = JSON.parse(resA.payload);
    tokenA = bodyA.token;
    userAId = bodyA.user.id;

    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: 'userb_' + Date.now(),
        email: `userb_${Date.now()}@example.com`,
        password: 'Password123',
        display_name: 'User B',
      },
    });
    expect(resB.statusCode).toBe(201);
    const bodyB = JSON.parse(resB.payload);
    tokenB = bodyB.token;
    userBId = bodyB.user.id;

    expect(userAId).not.toBe(userBId);
  });

  it('allows User A to record overtime hours', async () => {
    const recordId = uuidv4();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      payload: {
        id: recordId,
        record_date: '2026-10-01',
        start_time: '18:00',
        end_time: '20:30',
        break_duration_minutes: 0,
        description: 'Extra hours by User A',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user_id).toBe(userAId);
    expect(body.net_overtime_minutes).toBe(150);
  });

  it('ensures User B sees ZERO records and ZERO balance from User A', async () => {
    // Check User B records
    const recordsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/records',
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    expect(recordsRes.statusCode).toBe(200);
    const records = JSON.parse(recordsRes.payload);
    expect(records.length).toBe(0);

    // Check User B balance
    const balanceRes = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    expect(balanceRes.statusCode).toBe(200);
    const balance = JSON.parse(balanceRes.payload);
    expect(balance.total_positive_minutes).toBe(0);
    expect(balance.net_balance_minutes).toBe(0);
  });

  it('ensures User A balance reflects their own records', async () => {
    const balanceRes = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    expect(balanceRes.statusCode).toBe(200);
    const balance = JSON.parse(balanceRes.payload);
    expect(balance.total_positive_minutes).toBe(150);
    expect(balance.net_balance_minutes).toBe(150);
  });
});
