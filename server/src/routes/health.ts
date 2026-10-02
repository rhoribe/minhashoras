import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    try {
      // Simple query to verify DB connection
      db.prepare('SELECT 1').get();
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (err: any) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: err.message
      });
    }
  });
}
