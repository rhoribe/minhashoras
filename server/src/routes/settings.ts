import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { getUserSettings } from '../services/balance-calculator.js';
import { optionalAuthenticate } from './auth-routes.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', optionalAuthenticate);

  // GET /settings
  app.get('/settings', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const settings = getUserSettings(userId);
    return reply.send(settings);
  });

  // PUT /settings
  app.put('/settings', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const body = req.body as any;
      const current = getUserSettings(userId);

      const maxPositive = body.max_positive_limit_minutes !== undefined ? Number(body.max_positive_limit_minutes) : current.max_positive_limit_minutes;
      const maxNegative = body.max_negative_limit_minutes !== undefined ? Number(body.max_negative_limit_minutes) : current.max_negative_limit_minutes;
      const warningThreshold = body.warning_threshold_percentage !== undefined ? Number(body.warning_threshold_percentage) : current.warning_threshold_percentage;
      const dailyWork = body.daily_standard_work_minutes !== undefined ? Number(body.daily_standard_work_minutes) : current.daily_standard_work_minutes;
      const notifEnabled = body.notifications_enabled !== undefined ? (body.notifications_enabled ? 1 : 0) : current.notifications_enabled;
      const reminderTime = body.daily_reminder_time !== undefined ? body.daily_reminder_time : current.daily_reminder_time;
      const now = new Date().toISOString();

      if (maxPositive <= 0) {
        return reply.status(400).send({ error: 'BadRequest', message: 'max_positive_limit_minutes must be greater than 0' });
      }
      if (maxNegative >= 0) {
        return reply.status(400).send({ error: 'BadRequest', message: 'max_negative_limit_minutes must be less than 0' });
      }
      if (warningThreshold <= 0 || warningThreshold > 100) {
        return reply.status(400).send({ error: 'BadRequest', message: 'warning_threshold_percentage must be between 1 and 100' });
      }

      db.prepare(`
        UPDATE time_bank_settings
        SET max_positive_limit_minutes = ?,
            max_negative_limit_minutes = ?,
            warning_threshold_percentage = ?,
            daily_standard_work_minutes = ?,
            notifications_enabled = ?,
            daily_reminder_time = ?,
            updated_at = ?
        WHERE user_id = ?
      `).run(maxPositive, maxNegative, warningThreshold, dailyWork, notifEnabled, reminderTime, now, userId);

      const updated = getUserSettings(userId);
      return reply.send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });
}
