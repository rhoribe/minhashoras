import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';

describe('Authentication & User Management Contract Tests', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
    const userRepo = new UserRepository();
    userRepo.deleteUserByUsername('testworker');
  });

  const testUser = {
    username: 'testworker',
    email: 'testworker@example.com',
    password: 'Password123',
    display_name: 'Worker Test'
  };

  let authToken = '';

  it('POST /api/v1/auth/register creates a new user and issues a bearer token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.token).toBeDefined();
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe(testUser.username);
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.display_name).toBe(testUser.display_name);

    authToken = body.token;
  });

  it('POST /api/v1/auth/register rejects duplicate username or email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.message).toMatch(/já está em uso|já está cadastrado/);
  });

  it('POST /api/v1/auth/login authenticates with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        login: testUser.username,
        password: testUser.password
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.token).toBeDefined();
    expect(body.user.username).toBe(testUser.username);
  });

  it('POST /api/v1/auth/login rejects invalid credentials with 401', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        login: testUser.username,
        password: 'WrongPassword999'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/auth/me returns authenticated user details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.user.username).toBe(testUser.username);
    expect(body.preferences).toBeDefined();
    expect(body.preferences.theme_mode).toBe('system');
  });

  it('PUT /api/v1/user/preferences updates theme preference', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/user/preferences',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        theme_mode: 'dark'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.theme_mode).toBe('dark');
  });

  it('POST /api/v1/auth/logout revokes session token', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(logoutRes.statusCode).toBe(200);

    // Subsequent call should be unauthorized
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(meRes.statusCode).toBe(401);
  });
});
