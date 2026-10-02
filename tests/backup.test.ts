import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from '../server/src/index.js';
import { runMigrations } from '../server/src/db/migrate.js';
import { calculateNextRun, BackupScheduler } from '../server/src/services/backup-scheduler.js';
import { backupService } from '../server/src/services/backup-service.js';
import { backupRepository } from '../server/src/repositories/backup-repository.js';
import { db } from '../server/src/db/connection.js';
import { UserRepository } from '../server/src/repositories/user-repository.js';
import { AuthService } from '../server/src/services/auth-service.js';

describe('Backup & Export Mechanism (Feature 005)', () => {
  const app = buildServer();
  const userRepo = new UserRepository();
  const testBackupDir = path.resolve(process.cwd(), 'data/test-backups');
  let adminToken = '';

  const inject = (opts: any) => {
    return app.inject({
      ...opts,
      headers: {
        authorization: `Bearer ${adminToken}`,
        ...(opts.headers || {}),
      },
    });
  };

  beforeAll(async () => {
    process.env.BACKUP_DIR = testBackupDir;
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testBackupDir, { recursive: true });
    runMigrations();

    // Clean up previous runs
    backupRepository.cleanupOrphanRuns();
    db.prepare('DELETE FROM backup_runs').run();

    // Ensure admin user exists for backup tests
    userRepo.deleteUserByUsername('backup_suite_admin');
    userRepo.createUser({
      id: 'backup-suite-admin-id',
      username: 'backup_suite_admin',
      email: 'backup_suite_admin@example.com',
      password_hash: AuthService.hashPassword('AdminPassword123!'),
      display_name: 'Backup Suite Admin',
      role: 'admin',
      is_active: 1,
      must_change_password: 0,
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { login: 'backup_suite_admin', password: 'AdminPassword123!' },
    });
    adminToken = JSON.parse(loginRes.payload).token;

    // Reset default schedule
    backupRepository.updateSchedule('default', {
      enabled: false,
      frequency: 'daily',
      timeOfDay: '02:00',
      dayOfWeek: 0,
      dayOfMonth: 1,
      retentionCount: 7,
      targetDirectory: null,
    });
  });

  beforeEach(() => {
    backupRepository.cleanupOrphanRuns();
  });

  afterAll(() => {
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  describe('User Story 1: Schedule Calculation and Automatic Execution', () => {
    it('calculates next daily run correctly', () => {
      // Base date: 2026-10-02 01:00:00 local
      const baseDate = new Date(2026, 9, 2, 1, 0, 0);
      const nextRunSameDay = calculateNextRun(
        { frequency: 'daily', timeOfDay: '02:00' },
        baseDate
      );
      expect(nextRunSameDay.getHours()).toBe(2);
      expect(nextRunSameDay.getMinutes()).toBe(0);
      expect(nextRunSameDay.getDate()).toBe(2);

      // Base date: 2026-10-02 03:00:00 local (past 02:00)
      const pastDate = new Date(2026, 9, 2, 3, 0, 0);
      const nextRunNextDay = calculateNextRun(
        { frequency: 'daily', timeOfDay: '02:00' },
        pastDate
      );
      expect(nextRunNextDay.getDate()).toBe(3);
    });

    it('calculates next weekly run correctly', () => {
      // 2026-10-02 is a Friday (day 5)
      const baseDate = new Date(2026, 9, 2, 10, 0, 0);
      // Target: Sunday (day 0) at 02:00
      const nextSunday = calculateNextRun(
        { frequency: 'weekly', timeOfDay: '02:00', dayOfWeek: 0 },
        baseDate
      );
      expect(nextSunday.getDay()).toBe(0);
      expect(nextSunday.getTime()).toBeGreaterThan(baseDate.getTime());
    });

    it('calculates next monthly run correctly', () => {
      const baseDate = new Date(2026, 9, 2, 10, 0, 0);
      // Target: 1st day of month at 02:00 -> already passed in Oct, should be Nov 1st
      const nextMonth = calculateNextRun(
        { frequency: 'monthly', timeOfDay: '02:00', dayOfMonth: 1 },
        baseDate
      );
      expect(nextMonth.getDate()).toBe(1);
      expect(nextMonth.getMonth()).toBe(10); // November (0-indexed)
    });

    it('GET /api/v1/backups/schedule returns default schedule', async () => {
      const res = await inject({
        method: 'GET',
        url: '/api/v1/backups/schedule',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe('default');
      expect(body.frequency).toBe('daily');
      expect(body.timeOfDay).toBe('02:00');
      expect(body.retentionCount).toBe(7);
    });

    it('PUT /api/v1/backups/schedule updates schedule and validates input', async () => {
      // Invalid time of day
      const resInvalid = await inject({
        method: 'PUT',
        url: '/api/v1/backups/schedule',
        payload: { timeOfDay: '25:99' },
      });
      expect(resInvalid.statusCode).toBe(400);

      // Valid update
      const resValid = await inject({
        method: 'PUT',
        url: '/api/v1/backups/schedule',
        payload: {
          enabled: true,
          frequency: 'weekly',
          timeOfDay: '04:30',
          dayOfWeek: 1,
          retentionCount: 5,
        },
      });

      expect(resValid.statusCode).toBe(200);
      const body = JSON.parse(resValid.payload);
      expect(body.enabled).toBe(true);
      expect(body.frequency).toBe('weekly');
      expect(body.timeOfDay).toBe('04:30');
      expect(body.retentionCount).toBe(5);
      expect(body.nextRunAt).toBeDefined();
    });

    it('BackupScheduler tick executes backup when nextRunAt has passed', async () => {
      // Set schedule nextRunAt in past
      const pastTime = new Date(Date.now() - 10000).toISOString();
      backupRepository.updateSchedule('default', {
        enabled: true,
        nextRunAt: pastTime,
      });

      const scheduler = new BackupScheduler(backupRepository, backupService, 1000);
      await scheduler.tick();

      const lastRun = backupRepository.getLastCompletedRun();
      expect(lastRun).not.toBeNull();
      expect(lastRun?.triggerType).toBe('automated');
      expect(lastRun?.status).toBe('completed');
    });
  });

  describe('User Story 2: Manual Trigger and Instant Download', () => {
    let createdBackupId: string;

    it('POST /api/v1/backups/export triggers a manual backup', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
      });

      expect(res.statusCode).toBe(202);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.status).toBe('completed');
      expect(body.triggerType).toBe('manual');
      expect(body.checksumSha256).toBeDefined();
      expect(body.fileSizeBytes).toBeGreaterThan(0);
      expect(body.fileName).toMatch(/\.sqlite\.gz$/);

      createdBackupId = body.id;
    });

    it('POST /api/v1/backups/export accepts empty payload or empty string with application/json header (Feature 007)', async () => {
      // Empty JSON object
      const resJson = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
        headers: { 'content-type': 'application/json' },
        payload: '{}',
      });
      expect(resJson.statusCode).toBe(202);

      // Empty string payload with application/json header
      const resEmpty = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
        headers: { 'content-type': 'application/json' },
        payload: '',
      });
      expect(resEmpty.statusCode).toBe(202);
    });


    it('prevents simultaneous runs and returns HTTP 409 Conflict', async () => {
      // Simulate an active run in repository
      const activeRun = backupRepository.createRun({
        triggerType: 'manual',
        status: 'in_progress',
      });

      try {
        const res = await inject({
          method: 'POST',
          url: '/api/v1/backups/export',
        });

        expect(res.statusCode).toBe(409);
        const body = JSON.parse(res.payload);
        expect(body.statusCode).toBe(409);
        expect(body.error).toBe('Conflict');
      } finally {
        backupRepository.updateRun(activeRun.id, {
          status: 'failed',
          errorMessage: 'Cleaned up by test',
        });
      }
    });

    it('GET /api/v1/backups/:id/download downloads compressed backup file', async () => {
      const res = await inject({
        method: 'GET',
        url: `/api/v1/backups/${createdBackupId}/download`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/gzip');
      expect(res.headers['content-disposition']).toContain('attachment; filename=');
      expect(res.headers['x-checksum-sha256']).toBeDefined();
      expect(res.rawPayload.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/backups/:id/download returns 404 for unknown backup', async () => {
      const res = await inject({
        method: 'GET',
        url: '/api/v1/backups/non-existent-id/download',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('User Story 3: Retention Policy and Oldest Backup Purging', () => {
    it('purges oldest backups exceeding retention count', async () => {
      // Configure retentionCount = 2
      await inject({
        method: 'PUT',
        url: '/api/v1/backups/schedule',
        payload: { retentionCount: 2 },
      });

      // Run 3 manual backups to exceed retention of 2
      const res1 = await inject({ method: 'POST', url: '/api/v1/backups/export' });
      expect(res1.statusCode).toBe(202);
      const b1 = JSON.parse(res1.payload);

      const res2 = await inject({ method: 'POST', url: '/api/v1/backups/export' });
      expect(res2.statusCode).toBe(202);
      const b2 = JSON.parse(res2.payload);

      const res3 = await inject({ method: 'POST', url: '/api/v1/backups/export' });
      expect(res3.statusCode).toBe(202);
      const b3 = JSON.parse(res3.payload);

      // Verify that the earlier backup has been purged
      const historyRes = await inject({
        method: 'GET',
        url: '/api/v1/backups/history',
      });
      const history = JSON.parse(historyRes.payload);
      const completedRuns = history.runs.filter((r: any) => r.status === 'completed');
      const purgedRuns = history.runs.filter((r: any) => r.status === 'purged');

      expect(completedRuns.length).toBeLessThanOrEqual(2);
      expect(purgedRuns.length).toBeGreaterThan(0);

      // Verify purged backup download returns 404
      const purgedId = purgedRuns[0].id;
      const downloadRes = await inject({
        method: 'GET',
        url: `/api/v1/backups/${purgedId}/download`,
      });
      expect(downloadRes.statusCode).toBe(404);
    });
  });

  describe('User Story 4: Status, Audit History, and Integrity', () => {
    it('GET /api/v1/backups/status returns operational status', async () => {
      const res = await inject({
        method: 'GET',
        url: '/api/v1/backups/status',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.isRunning).toBe(false);
      expect(body.backupDirectory).toBeDefined();
      expect(body.isExternalAccessible).toBe(true);
      expect(body.lastRun).toBeDefined();
    });

    it('GET /api/v1/backups/history returns paginated audit history', async () => {
      const res = await inject({
        method: 'GET',
        url: '/api/v1/backups/history?limit=5&offset=0',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.total).toBeGreaterThan(0);
      expect(Array.isArray(body.runs)).toBe(true);
      expect(body.runs[0].checksumSha256).toBeDefined();
    });
  });

  describe('Feature 007: Safe Database Restore', () => {
    beforeAll(async () => {
      await inject({
        method: 'PUT',
        url: '/api/v1/backups/schedule',
        payload: { retentionCount: 7 },
      });
    });

    it('restores database state and creates automatic pre-restore safety snapshot', async () => {

      // 1. Create a baseline backup
      const createRes = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
        payload: '{}',
        headers: { 'content-type': 'application/json' },
      });
      expect(createRes.statusCode).toBe(202);
      const targetBackup = JSON.parse(createRes.payload);

      // 2. Perform restore from baseline backup
      const restoreRes = await inject({
        method: 'POST',
        url: `/api/v1/backups/${targetBackup.id}/restore`,
        payload: '{}',
        headers: { 'content-type': 'application/json' },
      });

      expect(restoreRes.statusCode).toBe(200);
      const restoreBody = JSON.parse(restoreRes.payload);
      expect(restoreBody.success).toBe(true);
      expect(restoreBody.restoredFromRun.id).toBe(targetBackup.id);
      expect(restoreBody.preRestoreRun.id).toBeDefined();
      expect(restoreBody.preRestoreRun.id).not.toBe('skipped');

      // Verify the pre-restore backup exists in repository
      const preRestoreRun = backupRepository.getRunById(restoreBody.preRestoreRun.id);
      expect(preRestoreRun).not.toBeNull();
      expect(preRestoreRun?.status).toBe('completed');
    });

    it('returns 404 when attempting to restore non-existent backup', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/v1/backups/non-existent-uuid/restore',
        payload: '{}',
        headers: { 'content-type': 'application/json' },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('NotFound');
    });

    it('returns 409 Conflict when restore is triggered while an operation is running', async () => {
      // Create a valid backup first
      const exportRes = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
      });
      const validBackup = JSON.parse(exportRes.payload);

      // Simulate active run
      const activeRun = backupRepository.createRun({
        triggerType: 'manual',
        status: 'in_progress',
      });

      try {
        const res = await inject({
          method: 'POST',
          url: `/api/v1/backups/${validBackup.id}/restore`,
        });

        expect(res.statusCode).toBe(409);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe('Conflict');
      } finally {
        backupRepository.updateRun(activeRun.id, {
          status: 'failed',
          errorMessage: 'Cleaned up by test',
        });
      }
    });

    it('returns 422 when archive checksum mismatch occurs', async () => {
      // Create a valid backup
      const exportRes = await inject({
        method: 'POST',
        url: '/api/v1/backups/export',
      });
      const validBackup = JSON.parse(exportRes.payload);

      // Tamper with checksumSha256 in repository
      backupRepository.updateRun(validBackup.id, {
        checksumSha256: 'tampered-checksum-1234567890abcdef',
      });

      const res = await inject({
        method: 'POST',
        url: `/api/v1/backups/${validBackup.id}/restore`,
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('UnprocessableEntity');
    });
  });
});

