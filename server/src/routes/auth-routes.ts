import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth-service.js';
import { UserRepository, UserEntity } from '../repositories/user-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { AdminRepository } from '../repositories/admin-repository.js';

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();
const adminRepository = new AdminRepository();

// Extend FastifyRequest interface with custom properties
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    user?: UserEntity;
    token?: string;
  }
}

/**
 * Authentication middleware/hook to verify Bearer session token.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticação não fornecido.',
    });
  }

  const token = authHeader.substring(7).trim();
  const session = sessionRepository.findByToken(token);

  if (!session) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Sessão inválida ou expirada. Por favor, autentique-se novamente.',
    });
  }

  const user = userRepository.findById(session.user_id);
  if (!user) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Usuário não encontrado.',
    });
  }

  if (user.is_active === 0) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Esta conta foi desativada pelo administrador.',
    });
  }

  sessionRepository.touchSession(token);
  request.userId = user.id;
  request.user = user;
  request.token = token;
}

/**
 * Require administrator role middleware/hook.
 * Enforces authentication and role === 'admin' and is_active === 1.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  if (!request.user || request.user.role !== 'admin' || request.user.is_active !== 1) {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Acesso restrito a administradores do sistema.',
    });
  }
}

/**
 * Optional authentication hook for routes that can work for authenticated users or fall back to default
 */
export async function optionalAuthenticate(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const session = sessionRepository.findByToken(token);
    if (session) {
      sessionRepository.touchSession(token);
      request.userId = session.user_id;
      request.user = userRepository.findById(session.user_id) || undefined;
      request.token = token;
      return;
    }
  }

  // Fallback to query/header/body or default
  const requestedUserId =
    (request.query as any)?.user_id ||
    (request.headers['x-user-id'] as string) ||
    (request.body as any)?.user_id ||
    (request.body as any)?.records?.[0]?.user_id ||
    (request.body as any)?.compensations?.[0]?.user_id;

  if (requestedUserId) {
    request.userId = requestedUserId;
    request.user = userRepository.findById(requestedUserId) || undefined;
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Register initial or new user
  app.post('/auth/register', async (request, reply) => {
    const body = request.body as {
      username?: string;
      email?: string;
      password?: string;
      display_name?: string;
    };

    if (!body.username || !body.email || !body.password || !body.display_name) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Todos os campos são obrigatórios: username, email, password, display_name.',
      });
    }

    if (!AuthService.validateUsername(body.username)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Nome de usuário inválido. Use de 3 a 30 caracteres alfanuméricos, hífen ou underline.',
      });
    }

    if (!AuthService.validateEmail(body.email)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Endereço de e-mail inválido.',
      });
    }

    const passwordCheck = AuthService.validatePassword(body.password);
    if (!passwordCheck.valid) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: passwordCheck.message,
      });
    }

    if (userRepository.findByUsername(body.username)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Este nome de usuário já está em uso.',
      });
    }

    if (userRepository.findByEmail(body.email)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Este e-mail já está cadastrado.',
      });
    }

    const userId = uuidv4();
    const passwordHash = AuthService.hashPassword(body.password);

    const user = userRepository.createUser({
      id: userId,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
      display_name: body.display_name.trim(),
      role: 'user',
      must_change_password: 0,
    });

    const token = AuthService.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    sessionRepository.createSession({
      id: uuidv4(),
      user_id: user.id,
      token,
      expires_at: expiresAt,
      user_agent: (request.headers['user-agent'] as string) || null,
      ip_address: request.ip,
    });

    adminRepository.insertAuditLog({
      user_id: user.id,
      event_type: 'login_success',
      ip_address: request.ip,
      user_agent: (request.headers['user-agent'] as string) || null,
      details: 'Registro e primeiro login da conta.',
    });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active === 1,
        must_change_password: user.must_change_password === 1,
        created_at: user.created_at,
      },
    });
  });

  // Login
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as {
      login?: string;
      password?: string;
    };

    if (!body.login || !body.password) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Login e senha são obrigatórios.',
      });
    }

    const user = userRepository.findByLogin(body.login);
    if (!user || !AuthService.verifyPassword(body.password, user.password_hash)) {
      adminRepository.insertAuditLog({
        user_id: user?.id || null,
        event_type: 'login_failed',
        ip_address: request.ip,
        user_agent: (request.headers['user-agent'] as string) || null,
        details: `Falha de autenticação para login: ${body.login}`,
      });

      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciais inválidas. Verifique seu login e senha.',
      });
    }

    if (user.is_active === 0) {
      adminRepository.insertAuditLog({
        user_id: user.id,
        event_type: 'login_failed',
        ip_address: request.ip,
        user_agent: (request.headers['user-agent'] as string) || null,
        details: 'Tentativa de login em conta desativada.',
      });

      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Esta conta foi desativada pelo administrador.',
      });
    }

    const token = AuthService.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    sessionRepository.createSession({
      id: uuidv4(),
      user_id: user.id,
      token,
      expires_at: expiresAt,
      user_agent: (request.headers['user-agent'] as string) || null,
      ip_address: request.ip,
    });

    adminRepository.insertAuditLog({
      user_id: user.id,
      event_type: 'login_success',
      ip_address: request.ip,
      user_agent: (request.headers['user-agent'] as string) || null,
      details: null,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active === 1,
        must_change_password: user.must_change_password === 1,
        created_at: user.created_at,
      },
    });
  });

  // Get active user & preferences (Protected)
  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user!;
    const preferences = userRepository.getPreferences(user.id);

    return reply.send({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active === 1,
        must_change_password: user.must_change_password === 1,
        created_at: user.created_at,
      },
      preferences,
    });
  });

  // Self-service account & personal data deletion (Protected)
  app.delete('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.userId!;

    const result = AuthService.deleteSelfAccount(userId, userRepository);
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: result.message,
        message: result.message,
      });
    }

    // Invalidate session
    if (request.token) {
      sessionRepository.deleteSession(request.token);
    }

    adminRepository.insertAuditLog({
      user_id: null,
      event_type: 'USER_SELF_DELETED',
      ip_address: request.ip,
      user_agent: (request.headers['user-agent'] as string) || null,
      details: `Conta e registros do usuário ID ${userId} foram excluídos pelo próprio usuário.`,
    });

    return reply.send({
      success: true,
      message: 'Sua conta e todos os seus registros foram excluídos permanentemente com sucesso.',
    });
  });

  // Change password (Protected)
  app.post('/auth/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as { new_password?: string };
    if (!body?.new_password) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'A nova senha é obrigatória.',
      });
    }

    const result = AuthService.changePassword(request.userId!, body.new_password, userRepository);
    if (!result.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: result.message,
        message: result.message,
      });
    }

    adminRepository.insertAuditLog({
      user_id: request.userId!,
      event_type: 'PASSWORD_CHANGED',
      ip_address: request.ip,
      user_agent: (request.headers['user-agent'] as string) || null,
      details: 'Senha atualizada pelo próprio usuário.',
    });

    const user = result.user || userRepository.findById(request.userId!)!;
    return reply.send({
      success: true,
      message: 'Senha atualizada com sucesso.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        is_active: user.is_active === 1,
        must_change_password: false,
        created_at: user.created_at,
      },
    });
  });

  // Logout (Protected)
  app.post('/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.token) {
      sessionRepository.deleteSession(request.token);
    }

    if (request.userId) {
      adminRepository.insertAuditLog({
        user_id: request.userId,
        event_type: 'logout',
        ip_address: request.ip,
        user_agent: (request.headers['user-agent'] as string) || null,
        details: null,
      });
    }

    return reply.send({ message: 'Sessão encerrada com sucesso.' });
  });

  // Update preferences (Protected)
  app.put('/user/preferences', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as any;

    if (body.theme_mode !== undefined && !['light', 'dark', 'system'].includes(body.theme_mode)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BadRequest',
        message: 'Modo de tema inválido. Use "light", "dark" ou "system".',
      });
    }

    if (body.daily_standard_work_minutes !== undefined) {
      const minutes = Number(body.daily_standard_work_minutes);
      if (isNaN(minutes) || minutes < 60 || minutes > 1440) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'daily_standard_work_minutes deve estar entre 60 e 1440 minutos.',
        });
      }
    }

    if (body.warning_threshold_percentage !== undefined) {
      const pct = Number(body.warning_threshold_percentage);
      if (isNaN(pct) || pct < 1 || pct > 100) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BadRequest',
          message: 'warning_threshold_percentage deve estar entre 1 e 100%.',
        });
      }
    }

    const updated = userRepository.upsertPreferences(request.userId!, body);
    return reply.send(updated);
  });
}
