import { FastifyInstance } from 'fastify';
import { recordsRepository } from '../repositories/records-repository.js';
import { recalculateBalance } from '../services/balance-calculator.js';
import { optionalAuthenticate } from './auth-routes.js';

export async function recordsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', optionalAuthenticate);

  // GET /records
  app.get('/records', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string };
    const records = recordsRepository.findAll(userId, start_date, end_date);
    return reply.send(records);
  });

  // GET /records/:id
  app.get('/records/:id', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const { id } = req.params as { id: string };
    const record = recordsRepository.findById(id);
    if (!record || record.user_id !== userId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Record not found' });
    }
    return reply.send(record);
  });

  // POST /records
  app.post('/records', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const body = req.body as any;
      if (!body.id || !body.record_date || !body.start_time || !body.end_time) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: 'Missing required fields: id, record_date, start_time, end_time'
        });
      }

      body.user_id = userId;
      const created = recordsRepository.create(body);
      recalculateBalance(created.user_id);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });

  // PUT /records/:id
  app.put('/records/:id', async (req, reply) => {
    try {
      const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
      const { id } = req.params as { id: string };
      const existing = recordsRepository.findById(id);
      if (!existing || existing.user_id !== userId) {
        return reply.status(404).send({ error: 'NotFound', message: 'Record not found' });
      }

      const body = req.body as any;
      const updated = recordsRepository.update(id, body);
      if (!updated) {
        return reply.status(404).send({ error: 'NotFound', message: 'Record not found' });
      }
      recalculateBalance(updated.user_id);
      return reply.send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: 'BadRequest', message: err.message });
    }
  });

  // DELETE /records/:id
  app.delete('/records/:id', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const { id } = req.params as { id: string };
    const existing = recordsRepository.findById(id);
    if (!existing || existing.user_id !== userId) {
      return reply.status(404).send({ error: 'NotFound', message: 'Record not found' });
    }
    const deleted = recordsRepository.delete(id);
    if (!deleted) {
      return reply.status(404).send({ error: 'NotFound', message: 'Record not found' });
    }
    recalculateBalance(existing.user_id);
    return reply.status(204).send();
  });
}
