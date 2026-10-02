import { FastifyInstance } from 'fastify';
import { authenticate } from './auth-routes.js';
import { userService } from '../services/user-service.js';
import { ResetUserRecordsRequest } from '../types/user-controls.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // All user-routes require an active authenticated user
  app.addHook('preHandler', authenticate);

  // GET /user/export-backup
  app.get('/user/export-backup', async (request, reply) => {
    try {
      const archive = userService.buildPersonalBackupArchive(request.userId!);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `minhashoras-backup-${archive.user.username}-${dateStr}.json`;

      reply.header('Content-Type', 'application/json; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      return reply.send(archive);
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'InternalServerError',
        message: err.message || 'Erro ao gerar backup pessoal.',
      });
    }
  });

  // POST /user/reset-records
  app.post('/user/reset-records', async (request, reply) => {
    const body = request.body as ResetUserRecordsRequest;

    if (body?.confirmation !== 'ZERAR-MEUS-REGISTROS') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: "Confirmação inválida. Digite 'ZERAR-MEUS-REGISTROS' para autorizar a limpeza dos seus registros.",
      });
    }

    try {
      const result = userService.resetUserRecords(
        request.userId!,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'InternalServerError',
        message: err.message || 'Erro ao resetar registros.',
      });
    }
  });
}
