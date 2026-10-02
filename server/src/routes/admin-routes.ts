import { FastifyInstance } from 'fastify';
import { requireAdmin } from './auth-routes.js';
import { AdminService } from '../services/admin-service.js';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const adminService = new AdminService();

  // All admin routes require admin role
  app.addHook('preHandler', requireAdmin);

  // 1. User Management
  app.get('/admin/users', async (_request, reply) => {
    const users = adminService.listUsers();
    return reply.send({ users });
  });

  app.post('/admin/users', async (request, reply) => {
    try {
      const user = adminService.createUser(
        request.body as any,
        request.userId,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.status(201).send({ user });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 400 ? 'BadRequest' : 'InternalServerError',
        message: err.message,
      });
    }
  });

  app.put('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const user = adminService.updateUser(
        id,
        request.body as any,
        request.userId,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send({ user });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 404 ? 'NotFound' : 'BadRequest',
        message: err.message,
      });
    }
  });

  app.post('/admin/users/:id/reset-password', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { new_password?: string };

    if (!body || !body.new_password) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'A nova senha é obrigatória.',
      });
    }

    try {
      adminService.resetPassword(
        id,
        body.new_password,
        request.userId,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send({ message: 'Senha do usuário redefinida com sucesso.' });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 404 ? 'NotFound' : 'BadRequest',
        message: err.message,
      });
    }
  });

  app.delete('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      adminService.deleteUser(
        id,
        request.userId,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send({ message: 'Usuário removido com sucesso.' });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 404 ? 'NotFound' : 'BadRequest',
        message: err.message,
      });
    }
  });

  // 2. Access Auditing & Sessions
  app.get('/admin/access-logs', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      event_type?: string;
      start_date?: string;
      end_date?: string;
    };

    const result = adminService.getAuditLogs({
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 25,
      search: query.search,
      event_type: query.event_type,
      start_date: query.start_date,
      end_date: query.end_date,
    });

    return reply.send(result);
  });

  app.get('/admin/sessions', async (request, reply) => {
    const currentToken = request.token;
    const sessions = adminService.listActiveSessions(currentToken);
    return reply.send({ sessions });
  });

  app.delete('/admin/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      adminService.revokeSession(
        id,
        request.userId,
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send({ message: 'Sessão revogada com sucesso.' });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: statusCode === 404 ? 'NotFound' : 'BadRequest',
        message: err.message,
      });
    }
  });

  // 3. System Usage Reports & Analytics
  app.get('/admin/reports/usage', async (request, reply) => {
    const query = request.query as { start_date?: string; end_date?: string };
    const metrics = adminService.getUsageMetrics(query.start_date, query.end_date);
    return reply.send(metrics);
  });

  app.get('/admin/reports/usage/export', async (request, reply) => {
    const query = request.query as { start_date?: string; end_date?: string };
    const csvContent = adminService.exportUsageCsv(query.start_date, query.end_date);
    const dateStr = new Date().toISOString().split('T')[0];

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="relatorio-consolidado-${dateStr}.csv"`);
    return reply.send(csvContent);
  });

  // 4. System Maintenance & Factory Reset
  app.post('/admin/system/reset', async (request, reply) => {
    try {
      const result = adminService.executeSystemReset(
        (request.body as any) || {},
        request.userId || '',
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.send(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return reply.status(statusCode).send({
        statusCode,
        error: err.message,
        message: err.message,
      });
    }
  });
}
