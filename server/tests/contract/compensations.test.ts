import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';
import { db } from '../../src/db/connection.js';

describe('Compensations API Contract (US3)', () => {
  const app = buildServer();
  const compId = '33333333-3333-4333-8333-333333333333';

  beforeAll(() => {
    runMigrations();
    db.prepare('DELETE FROM compensation_schedules WHERE id = ?').run(compId);
  });

  it('POST /api/v1/compensations pre-schedules compensation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/compensations',
      payload: {
        id: compId,
        planned_date: '2026-10-20',
        scheduled_minutes: 240,
        notes: 'Pre-scheduled day off'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(compId);
    expect(body.status).toBe('Scheduled');
    expect(body.scheduled_minutes).toBe(240);
  });

  it('GET /api/v1/compensations lists scheduled compensations', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/compensations',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((c: any) => c.id === compId)).toBe(true);
  });

  it('PUT /api/v1/compensations/:id marks compensation completed', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/compensations/${compId}`,
      payload: {
        status: 'Completed',
        actual_minutes: 240
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('Completed');
    expect(body.actual_minutes).toBe(240);
  });
});
