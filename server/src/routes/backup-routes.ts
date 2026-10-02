import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fs from 'node:fs';
import { requireAdmin } from './auth-routes.js';
import { backupRepository, BackupRepository } from '../repositories/backup-repository.js';
import { backupService, BackupService } from '../services/backup-service.js';
import { calculateNextRun } from '../services/backup-scheduler.js';
import { BackupFrequency, UpdateBackupScheduleInput } from '../types/backup.js';

interface RouteOptions extends FastifyPluginOptions {
  repository?: BackupRepository;
  service?: BackupService;
}

export async function backupRoutes(server: FastifyInstance, options: RouteOptions) {
  server.addHook('preHandler', requireAdmin);
  const repo = options.repository || backupRepository;
  const service = options.service || backupService;

  // GET /api/v1/backups/schedule
  server.get('/backups/schedule', async (_request, reply) => {
    let schedule = repo.getSchedule('default');
    if (!schedule) {
      schedule = repo.updateSchedule('default', {
        enabled: false,
        frequency: 'daily',
        timeOfDay: '02:00',
        retentionCount: 7,
      });
    }
    return reply.status(200).send(schedule);
  });

  // PUT /api/v1/backups/schedule
  server.put<{ Body: UpdateBackupScheduleInput }>('/backups/schedule', async (request, reply) => {
    const body = request.body || {};

    if (body.frequency !== undefined) {
      if (!['daily', 'weekly', 'monthly'].includes(body.frequency)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: "Invalid frequency. Must be 'daily', 'weekly', or 'monthly'",
        });
      }
    }

    if (body.timeOfDay !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(body.timeOfDay)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: "Invalid timeOfDay. Must match 'HH:MM' (24-hour format, e.g., '02:00')",
        });
      }
    }

    if (body.dayOfWeek !== undefined && body.dayOfWeek !== null) {
      if (typeof body.dayOfWeek !== 'number' || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid dayOfWeek. Must be between 0 (Sunday) and 6 (Saturday)',
        });
      }
    }

    if (body.dayOfMonth !== undefined && body.dayOfMonth !== null) {
      if (typeof body.dayOfMonth !== 'number' || body.dayOfMonth < 1 || body.dayOfMonth > 31) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid dayOfMonth. Must be between 1 and 31',
        });
      }
    }

    if (body.retentionCount !== undefined) {
      if (
        typeof body.retentionCount !== 'number' ||
        body.retentionCount < 1 ||
        body.retentionCount > 100
      ) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'Invalid retentionCount. Must be an integer between 1 and 100',
        });
      }
    }

    const current = repo.getSchedule('default');
    const enabled = body.enabled !== undefined ? body.enabled : current?.enabled ?? false;
    const frequency = (body.frequency || current?.frequency || 'daily') as BackupFrequency;
    const timeOfDay = body.timeOfDay || current?.timeOfDay || '02:00';
    const dayOfWeek = body.dayOfWeek !== undefined ? body.dayOfWeek : current?.dayOfWeek ?? 0;
    const dayOfMonth = body.dayOfMonth !== undefined ? body.dayOfMonth : current?.dayOfMonth ?? 1;

    let nextRunAt: string | null = null;
    if (enabled) {
      const nextDate = calculateNextRun(
        { frequency, timeOfDay, dayOfWeek, dayOfMonth },
        new Date()
      );
      nextRunAt = nextDate.toISOString();
    }

    const updated = repo.updateSchedule('default', {
      ...body,
      nextRunAt,
    });

    return reply.status(200).send(updated);
  });

  // POST /api/v1/backups/export
  server.post('/backups/export', async (_request, reply) => {
    try {
      const run = await service.executeBackup('manual', null);
      return reply.status(202).send(run);
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'BACKUP_IN_PROGRESS') {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: err.message || 'A backup process is already in progress',
        });
      }
      throw err;
    }
  });

  // GET /api/v1/backups/status
  server.get('/backups/status', async (_request, reply) => {
    const status = service.getStatus();
    return reply.status(200).send(status);
  });

  // GET /api/v1/backups/history
  server.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/backups/history',
    async (request, reply) => {
      const limit = parseInt(request.query.limit || '20', 10);
      const offset = parseInt(request.query.offset || '0', 10);
      const history = repo.listRuns(limit, offset);
      return reply.status(200).send(history);
    }
  );

  // GET /api/v1/backups/:id/download
  server.get<{ Params: { id: string } }>('/backups/:id/download', async (request, reply) => {
    const { id } = request.params;
    try {
      const { run, filePath } = service.getBackupFile(id);

      const stream = fs.createReadStream(filePath);
      const fileName = run.fileName || `minhashoras-backup-${id}.sqlite.gz`;

      reply.header('Content-Type', 'application/gzip');
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      if (run.checksumSha256) {
        reply.header('X-Checksum-SHA256', run.checksumSha256);
      }

      return reply.send(stream);
    } catch (err: any) {
      if (err.statusCode === 404) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NotFound',
          message: err.message || 'Backup not found or purged',
        });
      }
      throw err;
    }
  });

  // POST /api/v1/backups/:id/restore
  server.post<{ Params: { id: string }; Body?: { skipPreRestore?: boolean } }>(
    '/backups/:id/restore',
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body || {};

      try {
        const result = await service.restoreBackup(id, {
          skipPreRestore: body.skipPreRestore,
        });
        return reply.status(200).send(result);
      } catch (err: any) {
        if (err.statusCode === 404) {
          return reply.status(404).send({
            statusCode: 404,
            error: 'NotFound',
            message: err.message || 'Backup not found or purged',
          });
        }
        if (err.statusCode === 409 || err.code === 'OPERATION_IN_PROGRESS') {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: err.message || 'A backup or restore process is already in progress',
          });
        }
        if (err.statusCode === 422) {
          return reply.status(422).send({
            statusCode: 422,
            error: 'UnprocessableEntity',
            message: err.message || 'Backup archive integrity check failed',
          });
        }


        throw err;
      }
    }
  );
}

