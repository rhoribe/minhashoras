import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('Reports API Contracts (US4)', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  it('GET /api/v1/reports/export?format=csv returns CSV stream', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('Data,Entrada,Saida');
  });

  it('GET /api/v1/reports/export?format=xlsx returns Excel binary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=xlsx&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('GET /api/v1/reports/export?format=pdf returns PDF binary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=pdf&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('GET /api/v1/reports/export fails with 400 when format is invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=unknown&start_date=2026-10-01&end_date=2026-10-31',
    });

    expect(res.statusCode).toBe(400);
  });
});
