import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';
import { UserRepository } from '../../src/repositories/user-repository.js';

describe('Theme Preferences Contract Tests (US2)', () => {
  const app = buildServer();
  const testUsername = 'themeworker_' + Date.now();
  let authToken = '';

  beforeAll(async () => {
    runMigrations();
    const userRepo = new UserRepository();
    userRepo.deleteUserByUsername(testUsername);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'Password123',
        display_name: 'Theme Worker',
      },
    });

    const body = JSON.parse(res.payload);
    authToken = body.token;
  });

  it('defaults to system theme upon user creation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.preferences).toBeDefined();
    expect(body.preferences.theme_mode).toBe('system');
  });

  it('updates theme preference to "light"', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        theme_mode: 'light',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.theme_mode).toBe('light');

    // Verify GET /me reflects change
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });
    expect(JSON.parse(meRes.payload).preferences.theme_mode).toBe('light');
  });

  it('updates theme preference to "dark"', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        theme_mode: 'dark',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.theme_mode).toBe('dark');
  });

  it('updates theme preference back to "system"', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        theme_mode: 'system',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.theme_mode).toBe('system');
  });

  it('rejects invalid theme_mode with 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        theme_mode: 'neon',
      },
    });

    expect(res.statusCode).toBe(400);
  });
});
