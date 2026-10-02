import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user-repository.js';
import { SessionRepository } from '../repositories/session-repository.js';
import { AdminRepository } from '../repositories/admin-repository.js';
import { AuthService } from './auth-service.js';
import {
  AdminUserDto,
  CreateUserRequest,
  UpdateUserRequest,
  AccessAuditLogDto,
  AdminActiveSessionDto,
  SystemUsageMetricsDto,
  SystemResetRequest,
  SystemResetResult,
} from '../types/admin.js';

export class AdminService {
  constructor(
    private userRepo = new UserRepository(),
    private sessionRepo = new SessionRepository(),
    private adminRepo = new AdminRepository()
  ) {}

  listUsers(): AdminUserDto[] {
    const users = this.userRepo.listAllUsers();
    return users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      is_active: u.is_active === 1,
      created_at: u.created_at,
      updated_at: u.updated_at,
      active_sessions_count: u.active_sessions_count || 0,
    }));
  }

  createUser(data: CreateUserRequest, actorUserId?: string, ip?: string, userAgent?: string): AdminUserDto {
    if (!data.username || !data.email || !data.password || !data.display_name) {
      const err: any = new Error('Todos os campos são obrigatórios: username, email, password, display_name.');
      err.statusCode = 400;
      throw err;
    }

    if (!AuthService.validateUsername(data.username)) {
      const err: any = new Error('Nome de usuário inválido. Use de 3 a 30 caracteres alfanuméricos.');
      err.statusCode = 400;
      throw err;
    }

    if (!AuthService.validateEmail(data.email)) {
      const err: any = new Error('Endereço de e-mail inválido.');
      err.statusCode = 400;
      throw err;
    }

    const passwordCheck = AuthService.validatePassword(data.password);
    if (!passwordCheck.valid) {
      const err: any = new Error(passwordCheck.message);
      err.statusCode = 400;
      throw err;
    }

    if (this.userRepo.findByUsername(data.username)) {
      const err: any = new Error('Este nome de usuário já está em uso.');
      err.statusCode = 400;
      throw err;
    }

    if (this.userRepo.findByEmail(data.email)) {
      const err: any = new Error('Este e-mail já está cadastrado.');
      err.statusCode = 400;
      throw err;
    }

    const userId = uuidv4();
    const passwordHash = AuthService.hashPassword(data.password);
    const role = data.role === 'admin' ? 'admin' : 'user';

    const created = this.userRepo.createUser({
      id: userId,
      username: data.username,
      email: data.email,
      password_hash: passwordHash,
      display_name: data.display_name.trim(),
      role,
      is_active: 1,
    });

    this.adminRepo.insertAuditLog({
      user_id: actorUserId || null,
      event_type: 'user_created',
      ip_address: ip || null,
      user_agent: userAgent || null,
      details: JSON.stringify({
        target_user_id: created.id,
        target_username: created.username,
        role: created.role,
      }),
    });

    return {
      id: created.id,
      username: created.username,
      email: created.email,
      display_name: created.display_name,
      role: created.role,
      is_active: created.is_active === 1,
      created_at: created.created_at,
      updated_at: created.updated_at,
      active_sessions_count: 0,
    };
  }

  updateUser(id: string, updates: UpdateUserRequest, actorUserId?: string, ip?: string, userAgent?: string): AdminUserDto {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      const err: any = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    // Lockout protection: Cannot demote or deactivate the sole active administrator
    const isDemoting = updates.role && updates.role !== 'admin' && existing.role === 'admin';
    const isDeactivating = updates.is_active === false && existing.is_active === 1;

    if ((isDemoting || isDeactivating) && this.userRepo.isSoleAdmin(id)) {
      const err: any = new Error('Não é possível remover, desativar ou despromover o único administrador ativo do sistema.');
      err.statusCode = 400;
      throw err;
    }

    // Check email conflict if updated
    if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
      if (!AuthService.validateEmail(updates.email)) {
        const err: any = new Error('Endereço de e-mail inválido.');
        err.statusCode = 400;
        throw err;
      }
      const conflict = this.userRepo.findByEmail(updates.email);
      if (conflict && conflict.id !== id) {
        const err: any = new Error('Este e-mail já está em uso por outro usuário.');
        err.statusCode = 400;
        throw err;
      }
    }

    const updated = this.userRepo.updateUser(id, updates);
    if (!updated) {
      const err: any = new Error('Falha ao atualizar usuário.');
      err.statusCode = 500;
      throw err;
    }

    // If deactivated, revoke all active sessions
    if (updates.is_active === false) {
      this.sessionRepo.deleteUserSessions(id);
    }

    this.adminRepo.insertAuditLog({
      user_id: actorUserId || null,
      event_type: 'user_updated',
      ip_address: ip || null,
      user_agent: userAgent || null,
      details: JSON.stringify({
        target_user_id: id,
        changes: updates,
      }),
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      display_name: updated.display_name,
      role: updated.role,
      is_active: updated.is_active === 1,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      active_sessions_count: 0,
    };
  }

  resetPassword(id: string, newPassword: string, actorUserId?: string, ip?: string, userAgent?: string): void {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      const err: any = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    const check = AuthService.validatePassword(newPassword);
    if (!check.valid) {
      const err: any = new Error(check.message);
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = AuthService.hashPassword(newPassword);
    this.userRepo.updateUser(id, { password_hash: passwordHash });

    // Invalidate existing sessions for security
    this.sessionRepo.deleteUserSessions(id);

    this.adminRepo.insertAuditLog({
      user_id: actorUserId || null,
      event_type: 'password_reset',
      ip_address: ip || null,
      user_agent: userAgent || null,
      details: JSON.stringify({ target_user_id: id, target_username: existing.username }),
    });
  }

  deleteUser(id: string, actorUserId?: string, ip?: string, userAgent?: string): void {
    const existing = this.userRepo.findById(id);
    if (!existing) {
      const err: any = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (this.userRepo.isSoleAdmin(id)) {
      const err: any = new Error('Não é possível remover, desativar ou despromover o único administrador ativo do sistema.');
      err.statusCode = 400;
      throw err;
    }

    this.sessionRepo.deleteUserSessions(id);
    this.userRepo.deleteUser(id);

    this.adminRepo.insertAuditLog({
      user_id: actorUserId || null,
      event_type: 'user_deleted',
      ip_address: ip || null,
      user_agent: userAgent || null,
      details: JSON.stringify({ target_username: existing.username, target_email: existing.email }),
    });
  }

  getAuditLogs(params: {
    page?: number;
    limit?: number;
    search?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }): { logs: AccessAuditLogDto[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const result = this.adminRepo.getAuditLogs(params);
    const totalPages = Math.ceil(result.total / limit) || 1;

    return {
      logs: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: totalPages,
      },
    };
  }

  listActiveSessions(currentSessionToken?: string): AdminActiveSessionDto[] {
    const sessions = this.sessionRepo.listAllActiveSessions();
    return sessions.map(s => ({
      id: s.id,
      user_id: s.user_id,
      username: s.username,
      display_name: s.display_name,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      created_at: s.created_at,
      last_used_at: s.last_used_at,
      expires_at: s.expires_at,
      is_current_session: currentSessionToken ? s.token === currentSessionToken : false,
    }));
  }

  revokeSession(sessionId: string, actorUserId?: string, ip?: string, userAgent?: string): void {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      const err: any = new Error('Sessão não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    this.sessionRepo.deleteSessionById(sessionId);

    this.adminRepo.insertAuditLog({
      user_id: actorUserId || null,
      event_type: 'session_revoked',
      ip_address: ip || null,
      user_agent: userAgent || null,
      details: JSON.stringify({ revoked_session_id: sessionId, target_user_id: session.user_id }),
    });
  }

  getUsageMetrics(startDate?: string, endDate?: string): SystemUsageMetricsDto {
    return this.adminRepo.getSystemUsageMetrics(startDate, endDate);
  }

  exportUsageCsv(startDate?: string, endDate?: string): string {
    const metrics = this.getUsageMetrics(startDate, endDate);
    const bom = '\uFEFF';
    const lines: string[] = [];

    // Header summary
    lines.push('RELATÓRIO CONSOLIDADO DE USO - MINHAS HORAS');
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push(`Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}`);
    lines.push('');
    lines.push('RESUMO GERAL');
    lines.push(`Total de Usuários Cadastrados,${metrics.summary.total_users}`);
    lines.push(`Usuários Ativos,${metrics.summary.active_users}`);
    lines.push(`Total de Horas Extras,${(metrics.summary.total_overtime_minutes / 60).toFixed(2)}h (${metrics.summary.total_overtime_minutes} min)`);
    lines.push(`Total de Horas Compensadas,${(metrics.summary.total_compensation_minutes / 60).toFixed(2)}h (${metrics.summary.total_compensation_minutes} min)`);
    lines.push(`Saldo Líquido,${(metrics.summary.net_balance_minutes / 60).toFixed(2)}h (${metrics.summary.net_balance_minutes} min)`);
    lines.push(`Total de Lançamentos,${metrics.summary.total_entries_count}`);
    lines.push('');
    lines.push('DETALHAMENTO POR USUÁRIO');
    lines.push('Nome de Usuário,Nome de Exibição,Papel,Status,Horas Extras (h),Compensações (h),Saldo Líquido (h),Lançamentos,Último Lançamento');

    for (const u of metrics.users) {
      const otHours = (u.overtime_minutes / 60).toFixed(2);
      const compHours = (u.compensation_minutes / 60).toFixed(2);
      const netHours = (u.net_balance_minutes / 60).toFixed(2);
      const status = u.is_active ? 'Ativo' : 'Desativado';
      const role = u.role === 'admin' ? 'Administrador' : 'Usuário';
      const lastDate = u.last_entry_date || 'Nenhum';

      // CSV safe escaping
      const safeUsername = `"${u.username.replace(/"/g, '""')}"`;
      const safeDisplayName = `"${u.display_name.replace(/"/g, '""')}"`;

      lines.push(`${safeUsername},${safeDisplayName},${role},${status},${otHours},${compHours},${netHours},${u.entries_count},${lastDate}`);
    }

    return bom + lines.join('\r\n');
  }

  executeSystemReset(
    data: SystemResetRequest,
    actorUserId: string,
    ip?: string,
    userAgent?: string
  ): SystemResetResult {
    if (!data.confirmation || data.confirmation.trim().toUpperCase() !== 'ZERAR') {
      const err: any = new Error("Palavra-chave de confirmação inválida. Digite exatamente 'ZERAR' para prosseguir.");
      err.statusCode = 400;
      throw err;
    }

    let wipedBackupsCount = 0;
    const shouldDeleteBackups = data.deleteBackups !== false;

    if (shouldDeleteBackups) {
      // Collect file paths from backup runs table
      const filePaths = new Set<string>(this.adminRepo.getAllBackupFilePaths());

      // Also scan configured or default backup directory
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupDir)) {
        try {
          const files = fs.readdirSync(backupDir);
          for (const file of files) {
            if (file.endsWith('.sqlite') || file.endsWith('.db') || file.endsWith('.gz') || file.endsWith('.zip')) {
              filePaths.add(path.join(backupDir, file));
            }
          }
        } catch (e) {
          console.error('Error scanning backup directory:', e);
        }
      }

      // Unlink all physical backup files
      for (const filePath of filePaths) {
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            wipedBackupsCount++;
          } catch (e) {
            console.error(`Failed to delete backup file at ${filePath}:`, e);
          }
        }
      }

      // Clear backup_runs table
      this.adminRepo.clearBackupRuns();
    }

    // Execute atomic SQLite purge
    const { wipedRecordsCount, newEpoch } = this.adminRepo.executeDatabaseReset(actorUserId);

    // Record audit event
    this.adminRepo.insertAuditLog({
      user_id: actorUserId,
      event_type: 'SYSTEM_RESET',
      ip_address: ip,
      user_agent: userAgent,
      details: `Restauração de fábrica executada. Registros limpos: ${wipedRecordsCount}. Backups removidos: ${wipedBackupsCount}.`,
    });

    return {
      success: true,
      message: 'Base de dados e dados do sistema restaurados com sucesso.',
      wipedRecordsCount,
      wipedBackupsCount,
      epoch: newEpoch,
      resetAt: new Date().toISOString(),
    };
  }
}
