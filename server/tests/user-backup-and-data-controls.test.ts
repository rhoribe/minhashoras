import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { AuthService } from '../src/services/auth-service.js';
import { v4 as uuidv4 } from 'uuid';

describe('Feature 011: User-Scoped Backups & Data Controls Integration Tests', () => {
  const app = buildServer();
  const userRepo = new UserRepository();

  let adminToken = '';
  let adminId = '';
  let standardTokenA = '';
  let standardUserAId = '';
  let standardTokenB = '';
  let standardUserBId = '';

  const timestamp = Date.now();
  const adminUsername = `admin_ctrl_${timestamp}`;
  const userAUsername = `user_a_${timestamp}`;
  const userBUsername = `user_b_${timestamp}`;

  beforeAll(async () => {
    runMigrations();

    // 1. Create Admin User
    const admin = userRepo.createUser({
      id: `admin-ctrl-${timestamp}`,
      username: adminUsername,
      email: `${adminUsername}@example.com`,
      password_hash: AuthService.hashPassword('AdminSecret123!'),
      display_name: 'Admin Controller',
      role: 'admin',
      is_active: 1,
      must_change_password: 0,
    });
    adminId = admin.id;

    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: adminUsername, password: 'AdminSecret123!' },
    });
    adminToken = JSON.parse(adminLoginRes.payload).token;

    // 2. Register Standard User A
    const regResA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: userAUsername,
        email: `${userAUsername}@example.com`,
        password: 'PasswordUserA123!',
        display_name: 'User A',
      },
    });
    const regDataA = JSON.parse(regResA.payload);
    standardTokenA = regDataA.token;
    standardUserAId = regDataA.user.id;

    // 3. Register Standard User B
    const regResB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        username: userBUsername,
        email: `${userBUsername}@example.com`,
        password: 'PasswordUserB123!',
        display_name: 'User B',
      },
    });
    const regDataB = JSON.parse(regResB.payload);
    standardTokenB = regDataB.token;
    standardUserBId = regDataB.user.id;
  });

  // ==========================================
  // User Story 1: System vs User Backup Boundaries
  // ==========================================
  describe('US1: System-Wide vs. User-Scoped Backup Boundaries', () => {
    it('rejects standard users attempting to access system backup routes with 403 Forbidden', async () => {
      const scheduleRes = await app.inject({
        method: 'GET',
        url: '/api/v1/backups/schedule',
        headers: { authorization: `Bearer ${standardTokenA}` },
      });
      expect(scheduleRes.statusCode).toBe(403);
      const scheduleBody = JSON.parse(scheduleRes.payload);
      expect(scheduleBody.message).toContain('Acesso restrito a administradores');

      const statusRes = await app.inject({
        method: 'GET',
        url: '/api/v1/backups/status',
        headers: { authorization: `Bearer ${standardTokenA}` },
      });
      expect(statusRes.statusCode).toBe(403);
    });

    it('allows administrator to access system backup endpoints', async () => {
      const scheduleRes = await app.inject({
        method: 'GET',
        url: '/api/v1/backups/schedule',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(scheduleRes.statusCode).toBe(200);

      const statusRes = await app.inject({
        method: 'GET',
        url: '/api/v1/backups/status',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(statusRes.statusCode).toBe(200);
    });

    it('allows standard user to export personal backup containing only their records', async () => {
      // Create a record for User A
      const recAId = uuidv4();
      await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        headers: { authorization: `Bearer ${standardTokenA}` },
        payload: {
          id: recAId,
          record_date: '2026-10-02',
          start_time: '08:00',
          end_time: '18:00',
          break_duration_minutes: 60,
          description: 'Registro exclusivo User A',
        },
      });

      // Create a record for User B
      const recBId = uuidv4();
      await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        headers: { authorization: `Bearer ${standardTokenB}` },
        payload: {
          id: recBId,
          record_date: '2026-10-02',
          start_time: '09:00',
          end_time: '19:00',
          break_duration_minutes: 60,
          description: 'Registro exclusivo User B',
        },
      });

      // Request personal backup for User A
      const exportRes = await app.inject({
        method: 'GET',
        url: '/api/v1/user/export-backup',
        headers: { authorization: `Bearer ${standardTokenA}` },
      });

      expect(exportRes.statusCode).toBe(200);
      expect(exportRes.headers['content-disposition']).toContain('minhashoras-backup-');
      expect(exportRes.headers['content-disposition']).toContain(userAUsername);

      const backup = JSON.parse(exportRes.payload);
      expect(backup.metadata).toBeDefined();
      expect(backup.metadata.format_version).toBe('1.0');
      expect(backup.user.id).toBe(standardUserAId);
      expect(backup.user.username).toBe(userAUsername);
      expect(backup.user.password_hash).toBeUndefined(); // Crucial: no security leak

      // Contains User A's record but NOT User B's record
      const recordIds = backup.records.map((r: any) => r.id);
      expect(recordIds).toContain(recAId);
      expect(recordIds).not.toContain(recBId);
    });
  });

  // ==========================================
  // User Story 2: Voluntary Self-Service Password Change
  // ==========================================
  describe('US2: Voluntary Self-Service Password Change', () => {
    it('rejects voluntary password change if current_password is wrong', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { authorization: `Bearer ${standardTokenA}` },
        payload: {
          current_password: 'WrongCurrentPassword123!',
          new_password: 'BrandNewSecretPassword456!',
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('A senha atual informada está incorreta.');
    });

    it('rejects voluntary password change if new_password does not meet complexity', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { authorization: `Bearer ${standardTokenA}` },
        payload: {
          current_password: 'PasswordUserA123!',
          new_password: 'short',
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('mínimo 8 caracteres');
    });

    it('rejects voluntary password change if new_password is equal to current_password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { authorization: `Bearer ${standardTokenA}` },
        payload: {
          current_password: 'PasswordUserA123!',
          new_password: 'PasswordUserA123!',
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('não pode ser igual à senha atual');
    });

    it('allows voluntary password change with valid current_password and strong new_password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/change-password',
        headers: { authorization: `Bearer ${standardTokenA}` },
        payload: {
          current_password: 'PasswordUserA123!',
          new_password: 'BrandNewSecretPassword456!',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);

      // Verify old password fails
      const oldLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: userAUsername, password: 'PasswordUserA123!' },
      });
      expect(oldLoginRes.statusCode).toBe(401);

      // Verify new password succeeds
      const newLoginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { login: userAUsername, password: 'BrandNewSecretPassword456!' },
      });
      expect(newLoginRes.statusCode).toBe(200);
      standardTokenA = JSON.parse(newLoginRes.payload).token;
    });
  });

  // ==========================================
  // User Story 3: Personal Records Reset & Account Deletion
  // ==========================================
  describe('US3: Personal Records Reset & Account Deletion', () => {
    it('rejects personal records reset without exact confirmation token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/user/reset-records',
        headers: { authorization: `Bearer ${standardTokenB}` },
        payload: { confirmation: 'invalid' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('ZERAR-MEUS-REGISTROS');
    });

    it('purges overtime records and compensations and resets balance to zero upon confirmation', async () => {
      // Add a compensation for User B
      await app.inject({
        method: 'POST',
        url: '/api/v1/compensations',
        headers: { authorization: `Bearer ${standardTokenB}` },
        payload: {
          id: uuidv4(),
          planned_date: '2026-10-15',
          scheduled_minutes: 120,
          notes: 'Compensação User B',
        },
      });

      // Verify User B has records
      const beforeRecsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/records',
        headers: { authorization: `Bearer ${standardTokenB}` },
      });
      expect(JSON.parse(beforeRecsRes.payload).length).toBeGreaterThan(0);

      // Reset records
      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/v1/user/reset-records',
        headers: { authorization: `Bearer ${standardTokenB}` },
        payload: { confirmation: 'ZERAR-MEUS-REGISTROS' },
      });

      expect(resetRes.statusCode).toBe(200);
      const resetBody = JSON.parse(resetRes.payload);
      expect(resetBody.success).toBe(true);
      expect(resetBody.purgedRecordsCount).toBeGreaterThanOrEqual(1);

      // Verify records are gone for User B
      const afterRecsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/records',
        headers: { authorization: `Bearer ${standardTokenB}` },
      });
      expect(JSON.parse(afterRecsRes.payload)).toEqual([]);

      // Verify compensations are gone for User B
      const afterCompRes = await app.inject({
        method: 'GET',
        url: '/api/v1/compensations',
        headers: { authorization: `Bearer ${standardTokenB}` },
      });
      expect(JSON.parse(afterCompRes.payload)).toEqual([]);

      // Verify balance is reset to 0
      const balanceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/balance',
        headers: { authorization: `Bearer ${standardTokenB}` },
      });
      expect(balanceRes.statusCode).toBe(200);
      const balance = JSON.parse(balanceRes.payload);
      expect(balance.total_positive_minutes).toBe(0);
      expect(balance.total_negative_minutes).toBe(0);
      expect(balance.net_balance_minutes).toBe(0);

      // User account is STILL ACTIVE
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${standardTokenB}` },
      });
      expect(meRes.statusCode).toBe(200);
      const me = JSON.parse(meRes.payload);
      expect(me.user.id).toBe(standardUserBId);
      expect(me.user.username).toBe(userBUsername);
    });
  });
});
