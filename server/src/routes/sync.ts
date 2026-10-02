import { FastifyInstance } from 'fastify';
import { processBatchSync } from '../services/sync-service.js';
import { optionalAuthenticate } from './auth-routes.js';
import { AdminRepository } from '../repositories/admin-repository.js';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  const adminRepo = new AdminRepository();
  app.addHook('preHandler', optionalAuthenticate);

  // POST /sync
  app.post('/sync', async (req, reply) => {
    try {
      const payload = req.body as any;
      const userId = req.userId ||
        (req.headers['x-user-id'] as string) ||
        payload?.records?.[0]?.user_id ||
        payload?.compensations?.[0]?.user_id ||
        'default_user';
      const result = processBatchSync(payload || {}, userId);
      const systemEpoch = adminRepo.getMetadata('system_epoch') || 'initial';
      reply.header('x-system-epoch', systemEpoch);
      return reply.send({ ...result, system_epoch: systemEpoch });
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });
}
