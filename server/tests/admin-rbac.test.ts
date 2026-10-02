import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';

describe('Admin RBAC & User Management Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let adminToken = '';
  let standardToken = '';
  let adminId = '';
  let standardUserId = '';

  beforeAll(async () => {
    runMigrations();

    // Clean up test accounts
    userRepo.deleteUserByUsername('admintest');
    userRepo.deleteUserByUsername('usertest');
    userRepo.deleteUserByUsername('createdbyadmin');

    // Create an admin user
    const admin = userRepo.createUser({
      id: 'admin-test-id-123',
      username: 'admintest',
      email: 'admintest@example.com',
      password_hash: AuthService.hashPassword('AdminPassword123!'),
      display_name: 'Admin Test',
      role: 'admin',
      is_active: 1,
    });
    adminId = admin.id;

    // Login as admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'admintest', password: 'AdminPassword123!' },
    });
    adminToken = JSON.parse(adminLoginRes.payload).token;

    // Create a regular user
    const regularUser = userRepo.createUser({
      id: 'user-test-id-456',
      username: 'usertest',
      email: 'usertest@example.com',
      password_hash: AuthService.hashPassword('UserPassword123!'),
      display_name: 'Regular User',
      role: 'user',
      is_active: 1,
    });
    standardUserId = regularUser.id;

    // Login as regular user
    const userLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'usertest', password: 'UserPassword123!' },
    });
    standardToken = JSON.parse(userLoginRes.payload).token;
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects standard users with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { Authorization: `Bearer ${standardToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.message).toMatch(/Acesso restrito a administradores/);
  });

  it('allows administrators to list users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.some((u: any) => u.username === 'admintest')).toBe(true);
  });

  let createdUserId = '';

  it('allows administrator to create a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        username: 'createdbyadmin',
        email: 'created@example.com',
        display_name: 'Created By Admin',
        password: 'TemporaryPassword123!',
        role: 'user',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe('createdbyadmin');
    expect(body.user.role).toBe('user');
    createdUserId = body.user.id;
  });

  it('allows administrator to update user profile and promote to admin', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${createdUserId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        display_name: 'Promoted User',
        role: 'admin',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.role).toBe('admin');
    expect(body.user.display_name).toBe('Promoted User');
  });

  it('allows administrator to reset a user password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/users/${createdUserId}/reset-password`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        new_password: 'NewSecretPassword456!',
      },
    });
    expect(res.statusCode).toBe(200);

    // Verify login with new password
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        login: 'createdbyadmin',
        password: 'NewSecretPassword456!',
      },
    });
    expect(loginRes.statusCode).toBe(200);
  });

  it('allows administrator to delete a created user', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${createdUserId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('prevents demoting the sole administrator', async () => {
    const { db } = await import('../src/db/connection.js');
    db.prepare("UPDATE users SET role = 'user' WHERE id != ?").run(adminId);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/users/${adminId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
      payload: {
        role: 'user',
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toMatch(/único administrador/);
  });

  it('prevents deleting the sole administrator', async () => {
    const { db } = await import('../src/db/connection.js');
    db.prepare("UPDATE users SET role = 'user' WHERE id != ?").run(adminId);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/users/${adminId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toMatch(/único administrador/);
  });
});
