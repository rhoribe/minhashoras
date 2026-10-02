import { UserRepository } from '../repositories/user-repository.js';
import { recordsRepository } from '../repositories/records-repository.js';
import { compensationsRepository } from '../repositories/compensations-repository.js';
import { AdminRepository } from '../repositories/admin-repository.js';
import { recalculateBalance } from './balance-calculator.js';
import { db } from '../db/connection.js';
import { PersonalBackupArchive, ResetUserRecordsResponse } from '../types/user-controls.js';

export class UserService {
  constructor(
    private userRepo: UserRepository = new UserRepository(),
    private adminRepo: AdminRepository = new AdminRepository()
  ) {}

  buildPersonalBackupArchive(userId: string): PersonalBackupArchive {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const preferences = this.userRepo.getPreferences(userId);
    const balance = recalculateBalance(userId);
    const records = recordsRepository.findAll(userId);
    const compensations = compensationsRepository.findAll(userId);

    const archive: PersonalBackupArchive = {
      metadata: {
        format_version: '1.0',
        app: 'Minhas Horas',
        exported_at: new Date().toISOString(),
      },
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        created_at: user.created_at,
      },
      preferences: preferences
        ? {
            theme_mode: preferences.theme_mode,
            daily_standard_work_minutes: preferences.daily_standard_work_minutes,
            max_positive_limit_minutes: preferences.max_positive_limit_minutes,
            max_negative_limit_minutes: preferences.max_negative_limit_minutes,
            warning_threshold_percentage: preferences.warning_threshold_percentage,
          }
        : null,
      balance_summary: {
        total_positive_minutes: balance.total_positive_minutes,
        total_negative_minutes: balance.total_negative_minutes,
        net_balance_minutes: balance.net_balance_minutes,
        projected_balance_minutes: balance.projected_balance_minutes,
        last_calculated_at: balance.last_calculated_at,
      },
      records: records.map((r) => ({
        id: r.id,
        record_date: r.record_date,
        start_time: r.start_time,
        end_time: r.end_time,
        break_duration_minutes: r.break_duration_minutes,
        net_overtime_minutes: r.net_overtime_minutes,
        description: r.description,
        category: r.category,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      compensations: compensations.map((c) => ({
        id: c.id,
        planned_date: c.planned_date,
        scheduled_minutes: c.scheduled_minutes,
        actual_minutes: c.actual_minutes,
        status: c.status,
        notes: c.notes,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    };

    return archive;
  }

  resetUserRecords(userId: string, ip?: string, userAgent?: string): ResetUserRecordsResponse {
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const resetTransaction = db.transaction(() => {
      const purgedRecordsCount = recordsRepository.deleteAllForUser(userId);
      const purgedCompensationsCount = compensationsRepository.deleteAllForUser(userId);

      // Recalculate balance to zero out table
      recalculateBalance(userId);

      this.adminRepo.insertAuditLog({
        user_id: userId,
        event_type: 'USER_RECORDS_RESET',
        ip_address: ip || null,
        user_agent: userAgent || null,
        details: `Usuário ID ${userId} zerou todos os seus ${purgedRecordsCount} registros e ${purgedCompensationsCount} compensações.`,
      });

      return {
        purgedRecordsCount,
        purgedCompensationsCount,
      };
    });

    const counts = resetTransaction();
    const now = new Date().toISOString();

    return {
      success: true,
      message: 'Todos os seus registros de horas extras e compensações foram zerados com sucesso.',
      purgedRecordsCount: counts.purgedRecordsCount,
      purgedCompensationsCount: counts.purgedCompensationsCount,
      resetAt: now,
    };
  }
}

export const userService = new UserService();
