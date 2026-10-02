import { FastifyInstance } from 'fastify';
import { compensationsRepository } from '../repositories/compensations-repository.js';
import { recalculateBalance } from '../services/balance-calculator.js';
import { optionalAuthenticate } from './auth-routes.js';

export async function compensationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', optionalAuthenticate);

  // GET /compensations
  app.get('/compensations', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const list = compensationsRepository.findAll(userId);
    return reply.send(list);
  });

  // POST /compensations
  app.post('/compensations', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const body = req.body as any;
      if (!body.id || !body.planned_date || !body.scheduled_minutes) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: 'Missing required fields: id, planned_date, scheduled_minutes'
        });
      }

      body.user_id = userId;
      const created = compensationsRepository.create(body);
      recalculateBalance(userId);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });

  // PUT /compensations/:id
  app.put('/compensations/:id', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const { id } = req.params as { id: string };
      const existing = compensationsRepository.findById(id);
      if (!existing || existing.user_id !== userId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Compensation not found' });
      }

      const body = req.body as any;
      const updated = compensationsRepository.update(id, body);
      if (!updated) {
        return reply.status(404).send({ error: 'NotFound', message: 'Compensation not found' });
      }
      recalculateBalance(updated.user_id);
      return reply.send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });

  // DELETE /compensations/:id
  app.delete('/compensations/:id', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const { id } = req.params as { id: string };
    const existing = compensationsRepository.findById(id);
    if (!existing || existing.user_id !== userId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Compensation not found' });
    }

    const deleted = compensationsRepository.delete(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'NotFound', message: 'Compensation not found' });
    }
    recalculateBalance(existing.user_id);
    return reply.status(204).send();
  });
}
