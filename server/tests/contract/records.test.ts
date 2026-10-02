import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('Records API Contracts (US1)', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  const recordId = '11111111-1111-4111-8111-111111111111';

  it('POST /api/v1/records creates a new record and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      payload: {
        id: recordId,
        record_date: '2026-10-01',
        start_time: '18:00',
        end_time: '20:30',
        break_duration_minutes: 0,
        description: 'Test shift',
        category: 'standard'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(recordId);
    expect(body.net_overtime_minutes).toBe(150);
  });

  it('GET /api/v1/records lists recorded shifts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/records',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((r: any) => r.id === recordId)).toBe(true);
  });

  it('PUT /api/v1/records/:id updates record details', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/records/${recordId}`,
      payload: {
        description: 'Updated shift description',
        break_duration_minutes: 30
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.description).toBe('Updated shift description');
    expect(body.net_overtime_minutes).toBe(120); // 150m - 30m break = 120m
  });

  it('DELETE /api/v1/records/:id deletes the record', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/records/${recordId}`,
    });

    expect(res.statusCode).toBe(204);
  });
});
