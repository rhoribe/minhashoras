import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './db/migrate.js';
import { healthRoutes } from './routes/health.js';
import { recordsRoutes } from './routes/records.js';
import { syncRoutes } from './routes/sync.js';
import { balanceRoutes } from './routes/balance.js';
import { settingsRoutes } from './routes/settings.js';
import { compensationsRoutes } from './routes/compensations.js';
import { reportsRoutes } from './routes/reports.js';
import { authRoutes } from './routes/auth-routes.js';
import { userRoutes } from './routes/user-routes.js';
import { backupRoutes } from './routes/backup-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
import { backupScheduler } from './services/backup-scheduler.js';

export function buildServer() {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.register(cors, {
    origin: true,
  });

  // Accept empty or whitespace bodies when Content-Type is application/json
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body: string, done) => {
    if (!body || body.trim() === '') {
      return done(null, {});
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      statusCode: error.statusCode || 500,
      error: error.name || 'InternalServerError',
      message: error.message || 'An unexpected error occurred',
    });
  });

  // Mount API routes
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(authRoutes, { prefix: '/api' });
  app.register(userRoutes, { prefix: '/api/v1' });
  app.register(userRoutes, { prefix: '/api' });
  app.register(adminRoutes, { prefix: '/api/v1' });
  app.register(adminRoutes, { prefix: '/api' });
  app.register(healthRoutes, { prefix: '/api/v1' });
  app.register(recordsRoutes, { prefix: '/api/v1' });
  app.register(syncRoutes, { prefix: '/api/v1' });
  app.register(balanceRoutes, { prefix: '/api/v1' });
  app.register(settingsRoutes, { prefix: '/api/v1' });
  app.register(compensationsRoutes, { prefix: '/api/v1' });
  app.register(reportsRoutes, { prefix: '/api/v1' });
  app.register(backupRoutes, { prefix: '/api/v1' });

  // Serve static assets if client build exists
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDistPath)) {
    app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
    });

    // SPA fallback
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'NotFound', message: 'API route not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  return app;
}

async function start() {
  try {
    runMigrations();
    backupScheduler.start();

    const app = buildServer();
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`Minhas Horas server listening on http://${host}:${port}`);

    const shutdown = async () => {
      console.log('Shutting down Minhas Horas server...');
      backupScheduler.stop();
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  start();
}
