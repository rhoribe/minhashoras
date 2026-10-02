import { FastifyInstance } from 'fastify';
import { recalculateBalance } from '../services/balance-calculator.js';
import { optionalAuthenticate } from './auth-routes.js';

export async function balanceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', optionalAuthenticate);

  // GET /balance
  app.get('/balance', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const summary = recalculateBalance(userId);
      return reply.send(summary);
    } catch (err: any) {
      return reply.status(500).send({ error: 'InternalServerError', message: err.message });
    }
  });
}
