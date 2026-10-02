import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('Healthcheck Route Contract', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  it('GET /api/v1/health returns status ok and database connected', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.timestamp).toBeDefined();
  });
});
