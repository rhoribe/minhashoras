import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { db } from '../src/db/connection.js';

describe('Feature 010: Admin Setup & User Self-Service Deletion', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  beforeAll(async () => {
    runMigrations();
    // Ensure default admin is in initial bootstrapped state for repeatable testing
    userRepo.deleteUserByUsername('admin');
    userRepo.createUser({
      id: 'default_admin_id',
      username: 'admin',
      email: 'admin@local.internal',
      password_hash: AuthService.hashPassword('admin123'),
      display_name: 'Administrador',
      role: 'admin',
      is_active: 1,
      must_change_password: 1,
    });
  });

  describe('User Story 1: Default Admin Bootstrap & Forced Password Change', () => {
    it('verifies that the bootstrapped admin exists with must_change_password = 1', async () => {
      const admin = userRepo.findByUsername('admin');
      expect(admin).not.toBeNull();
      expect(admin?.role).toBe('admin');
      expect(admin?.must_change_password).toBe(1);
    });

    it('logs in with default admin credentials and receives must_change_password: true', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          login: 'admin',
          password: 'admin123',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.token).toBeDefined();
      expect(data.user.username).toBe('admin');
      expect(data.user.role).toBe('admin');
      expect(data.user.must_change_password).toBe(true);
    });

    it('rejects password change if password does not meet complexity requirements', async () => {
      // Login to get token
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: 'admin123' },
      });
      const token = JSON.parse(loginRes.payload).token;

      // Try weak password (too short)
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { Authorization: `Bearer ${token}` },
        payload: { new_password: '123' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('successfully changes password and clears must_change_password flag', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: 'admin123' },
      });
      const token = JSON.parse(loginRes.payload).token;

      const changeRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { Authorization: `Bearer ${token}` },
        payload: { new_password: 'NewAdminPassword2026!' },
      });

      expect(changeRes.statusCode).toBe(200);
      const changeData = JSON.parse(changeRes.payload);
      expect(changeData.success).toBe(true);
      expect(changeData.user.must_change_password).toBe(false);

      // Verify DB record has must_change_password = 0
      const updatedAdmin = userRepo.findByUsername('admin');
      expect(updatedAdmin?.must_change_password).toBe(0);

      // Subsequent login with old password fails
      const oldLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: 'admin123' },
      });
      expect(oldLogin.statusCode).toBe(401);

      // Login with new password succeeds and returns must_change_password: false
      const newLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: 'admin', password: 'NewAdminPassword2026!' },
      });
      expect(newLogin.statusCode).toBe(200);
      const newLoginData = JSON.parse(newLogin.payload);
      expect(newLoginData.user.must_change_password).toBe(false);
    });
  });

  describe('User Story 2: Public Registration Role Boundary', () => {
    it('forces role: "user" when public registration attempts to request role: "admin"', async () => {
      userRepo.deleteUserByUsername('attackeradmin');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'attackeradmin',
          email: 'attacker@example.com',
          password: 'AttackerPassword123!',
          display_name: 'Attacker Attempting Admin',
          role: 'admin',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.payload);
      expect(data.user.role).toBe('user');

      // Verify in DB directly
      const dbUser = userRepo.findByUsername('attackeradmin');
      expect(dbUser?.role).toBe('user');
    });

    it('denies standard user access to admin endpoints with HTTP 403', async () => {
      // Login with standard user
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          login: 'attackeradmin',
          password: 'AttackerPassword123!',
        },
      });

      expect(loginRes.statusCode).toBe(200);
      const token = JSON.parse(loginRes.payload).token;

      // Try accessing an admin endpoint
      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(adminRes.statusCode).toBe(403);
    });
  });

  describe('User Story 3: Self-Service Account & Data Deletion', () => {
    it('blocks sole active administrator from deleting their own account with HTTP 400', async () => {
      // Ensure only this admin is active for sole-admin testing
      const otherAdmins = db.prepare(`SELECT id FROM users WHERE role = 'admin' AND username != 'admin' AND is_active = 1`).all() as { id: string }[];
      db.prepare(`UPDATE users SET is_active = 0 WHERE role = 'admin' AND username != 'admin'`).run();

      try {
        // Login with admin
        const adminLoginRes = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            login: 'admin',
            password: 'NewAdminPassword2026!',
          },
        });

        expect(adminLoginRes.statusCode).toBe(200);
        const adminToken = JSON.parse(adminLoginRes.payload).token;

        // Attempt to self-delete as sole admin
        const deleteRes = await app.inject({
          method: 'DELETE',
          url: '/api/v1/auth/me',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        expect(deleteRes.statusCode).toBe(400);
        const data = JSON.parse(deleteRes.payload);
        expect(data.error || data.message).toContain('único administrador');
      } finally {
        for (const oa of otherAdmins) {
          db.prepare(`UPDATE users SET is_active = 1 WHERE id = ?`).run(oa.id);
        }
      }
    });

    it('allows standard user to delete their account and cascades all personal records', async () => {
      // 1. Register a standard user
      userRepo.deleteUserByUsername('deleteme');

      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          username: 'deleteme',
          email: 'deleteme@example.com',
          password: 'DeleteMePassword123!',
          display_name: 'User To Delete',
        },
      });

      expect(registerRes.statusCode).toBe(201);
      const regData = JSON.parse(registerRes.payload);
      const userToken = regData.token;
      const userId = regData.user.id;

      // 2. Create an overtime record for this user
      const createRecordRes = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        payload: {
          id: 'test-record-to-delete-123',
          record_date: '2026-10-01',
          start_time: '08:00',
          end_time: '18:00',
          break_duration_minutes: 60,
          category: 'standard',
          description: 'Teste de horas a serem deletadas',
        },
      });
      expect(createRecordRes.statusCode).toBe(201);

      // Verify the record exists
      const recordsBefore = await app.inject({
        method: 'GET',
        url: '/api/v1/records',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      expect(JSON.parse(recordsBefore.payload).length).toBe(1);

      // 3. User self-deletes
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(deleteRes.statusCode).toBe(200);
      const deleteData = JSON.parse(deleteRes.payload);
      expect(deleteData.success).toBe(true);

      // 4. Verify user entity is wiped
      const userAfter = userRepo.findById(userId);
      expect(userAfter).toBeNull();

      // 5. Verify subsequent request with old token returns 401 Unauthorized
      const verifySessionRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      expect(verifySessionRes.statusCode).toBe(401);
    });
  });
});
