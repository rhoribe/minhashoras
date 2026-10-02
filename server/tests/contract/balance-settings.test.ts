import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('Balance & Settings API Contracts (US2)', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  it('GET /api/v1/balance returns current balance summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.total_positive_minutes).toBeDefined();
    expect(body.net_balance_minutes).toBeDefined();
    expect(body.settings).toBeDefined();
  });

  it('GET /api/v1/settings returns user settings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/settings',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.max_positive_limit_minutes).toBeDefined();
    expect(body.warning_threshold_percentage).toBeDefined();
  });

  it('PUT /api/v1/settings updates time bank limits', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings',
      payload: {
        max_positive_limit_minutes: 3000,
        max_negative_limit_minutes: -900,
        warning_threshold_percentage: 85,
        notifications_enabled: true
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.max_positive_limit_minutes).toBe(3000);
    expect(body.warning_threshold_percentage).toBe(85);
  });
});
