import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { AccessAuditLogDto, SystemUsageMetricsDto } from '../types/admin.js';

export class AdminRepository {
  insertAuditLog(log: {
    id?: string;
    user_id?: string | null;
    event_type: string;
    ip_address?: string | null;
    user_agent?: string | null;
    details?: string | null;
  }): void {
    const id = log.id || uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO access_audit_logs (
        id, user_id, event_type, ip_address, user_agent, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      log.user_id || null,
      log.event_type,
      log.ip_address || null,
      log.user_agent || null,
      log.details || null,
      now
    );
  }

  getAuditLogs(params: {
    page?: number;
    limit?: number;
    search?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
  }): { logs: AccessAuditLogDto[]; total: number } {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const offset = (page - 1) * limit;

    let baseFilter = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (params.search) {
      baseFilter += ' AND (u.username LIKE ? OR u.email LIKE ? OR a.details LIKE ?)';
      const searchPattern = `%${params.search.toLowerCase()}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (params.event_type) {
      baseFilter += ' AND a.event_type = ?';
      queryParams.push(params.event_type);
    }

    if (params.start_date) {
      baseFilter += ' AND a.created_at >= ?';
      queryParams.push(params.start_date);
    }

    if (params.end_date) {
      baseFilter += ' AND a.created_at <= ?';
      queryParams.push(params.end_date);
    }

    const countSql = `
      SELECT COUNT(*) as count
      FROM access_audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${baseFilter}
    `;
    const totalRow = db.prepare(countSql).get(...queryParams) as { count: number };
    const total = totalRow.count;

    const dataSql = `
      SELECT 
        a.id,
        a.user_id,
        u.username,
        u.display_name,
        a.event_type,
        a.ip_address,
        a.user_agent,
        a.details,
        a.created_at
      FROM access_audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${baseFilter}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = db.prepare(dataSql).all(...queryParams, limit, offset) as AccessAuditLogDto[];

    return { logs, total };
  }

  getSystemUsageMetrics(startDate?: string, endDate?: string): SystemUsageMetricsDto {
    const totalUsersRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const activeUsersRow = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };

    // Overtime total
    let overtimeSql = 'SELECT COALESCE(SUM(net_overtime_minutes), 0) as total, COUNT(*) as count FROM overtime_records WHERE 1=1';
    const overtimeParams: any[] = [];
    if (startDate) {
      overtimeSql += ' AND record_date >= ?';
      overtimeParams.push(startDate);
    }
    if (endDate) {
      overtimeSql += ' AND record_date <= ?';
      overtimeParams.push(endDate);
    }
    const overtimeSummary = db.prepare(overtimeSql).get(...overtimeParams) as { total: number; count: number };

    // Compensation total
    let compSql = "SELECT COALESCE(SUM(COALESCE(actual_minutes, scheduled_minutes, 0)), 0) as total, COUNT(*) as count FROM compensation_schedules WHERE status != 'Cancelled'";
    const compParams: any[] = [];
    if (startDate) {
      compSql += ' AND planned_date >= ?';
      compParams.push(startDate);
    }
    if (endDate) {
      compSql += ' AND planned_date <= ?';
      compParams.push(endDate);
    }
    const compSummary = db.prepare(compSql).get(...compParams) as { total: number; count: number };

    const totalOvertime = overtimeSummary.total || 0;
    const totalComp = compSummary.total || 0;
    const netBalance = totalOvertime - totalComp;
    const totalEntries = (overtimeSummary.count || 0) + (compSummary.count || 0);

    // Per-user breakdown
    const allUsers = db.prepare(`
      SELECT id, username, display_name, role, is_active FROM users ORDER BY username ASC
    `).all() as Array<{ id: string; username: string; display_name: string; role: 'admin' | 'user'; is_active: number }>;

    // Query aggregate overtime by user
    let userOtSql = `
      SELECT user_id, COALESCE(SUM(net_overtime_minutes), 0) as ot_minutes, COUNT(*) as ot_count, MAX(record_date) as max_date
      FROM overtime_records
      WHERE 1=1
    `;
    const userOtParams: any[] = [];
    if (startDate) {
      userOtSql += ' AND record_date >= ?';
      userOtParams.push(startDate);
    }
    if (endDate) {
      userOtSql += ' AND record_date <= ?';
      userOtParams.push(endDate);
    }
    userOtSql += ' GROUP BY user_id';
    const userOtRows = db.prepare(userOtSql).all(...userOtParams) as Array<{ user_id: string; ot_minutes: number; ot_count: number; max_date: string | null }>;
    const otMap = new Map(userOtRows.map(r => [r.user_id, r]));

    // Query aggregate compensation by user
    let userCompSql = `
      SELECT user_id, COALESCE(SUM(COALESCE(actual_minutes, scheduled_minutes, 0)), 0) as comp_minutes, COUNT(*) as comp_count, MAX(planned_date) as max_date
      FROM compensation_schedules
      WHERE status != 'Cancelled'
    `;
    const userCompParams: any[] = [];
    if (startDate) {
      userCompSql += ' AND planned_date >= ?';
      userCompParams.push(startDate);
    }
    if (endDate) {
      userCompSql += ' AND planned_date <= ?';
      userCompParams.push(endDate);
    }
    userCompSql += ' GROUP BY user_id';
    const userCompRows = db.prepare(userCompSql).all(...userCompParams) as Array<{ user_id: string; comp_minutes: number; comp_count: number; max_date: string | null }>;
    const compMap = new Map(userCompRows.map(r => [r.user_id, r]));

    const usersBreakdown = allUsers.map(u => {
      const ot = otMap.get(u.id);
      const comp = compMap.get(u.id);

      const otMinutes = ot ? ot.ot_minutes : 0;
      const compMinutes = comp ? comp.comp_minutes : 0;
      const otCount = ot ? ot.ot_count : 0;
      const compCount = comp ? comp.comp_count : 0;

      let lastDate: string | null = null;
      if (ot?.max_date && comp?.max_date) {
        lastDate = ot.max_date > comp.max_date ? ot.max_date : comp.max_date;
      } else {
        lastDate = ot?.max_date || comp?.max_date || null;
      }

      return {
        user_id: u.id,
        username: u.username,
        display_name: u.display_name,
        role: u.role,
        is_active: u.is_active === 1,
        overtime_minutes: otMinutes,
        compensation_minutes: compMinutes,
        net_balance_minutes: otMinutes - compMinutes,
        entries_count: otCount + compCount,
        last_entry_date: lastDate,
      };
    });

    return {
      summary: {
        total_users: totalUsersRow.count,
        active_users: activeUsersRow.count,
        total_overtime_minutes: totalOvertime,
        total_compensation_minutes: totalComp,
        net_balance_minutes: netBalance,
        total_entries_count: totalEntries,
      },
      users: usersBreakdown,
    };
  }

  getMetadata(key: string): string | null {
    const row = db.prepare('SELECT value FROM system_metadata WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  setMetadata(key: string, value: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO system_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
  }

  getAllBackupFilePaths(): string[] {
    const rows = db.prepare('SELECT file_path FROM backup_runs WHERE file_path IS NOT NULL').all() as { file_path: string }[];
    return rows.map(r => r.file_path);
  }

  clearBackupRuns(): number {
    const countRow = db.prepare('SELECT COUNT(*) as c FROM backup_runs').get() as { c: number };
    db.prepare('DELETE FROM backup_runs').run();
    return countRow ? countRow.c : 0;
  }

  executeDatabaseReset(adminUserId: string): { wipedRecordsCount: number; newEpoch: string } {
    return db.transaction(() => {
      const otCount = (db.prepare('SELECT COUNT(*) as c FROM overtime_records').get() as any)?.c || 0;
      const compCount = (db.prepare('SELECT COUNT(*) as c FROM compensation_schedules').get() as any)?.c || 0;

      // Wipe operational records
      db.prepare('DELETE FROM overtime_records').run();
      db.prepare('DELETE FROM compensation_schedules').run();
      db.prepare('DELETE FROM user_sessions').run();
      db.prepare('DELETE FROM access_audit_logs').run();

      // Delete non-admin users or other users, preserving active admin
      db.prepare("DELETE FROM users WHERE role != 'admin' OR id != ?").run(adminUserId);

      // Reset admin time bank balance to 0
      db.prepare(`
        INSERT INTO time_bank_balance (user_id, total_positive_minutes, total_negative_minutes, net_balance_minutes, projected_balance_minutes, last_calculated_at)
        VALUES (?, 0, 0, 0, 0, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          total_positive_minutes = 0,
          total_negative_minutes = 0,
          net_balance_minutes = 0,
          projected_balance_minutes = 0,
          last_calculated_at = datetime('now')
      `).run(adminUserId);

      // Generate new system epoch
      const newEpoch = uuidv4();
      this.setMetadata('system_epoch', newEpoch);
      this.setMetadata('last_reset_at', new Date().toISOString());

      return {
        wipedRecordsCount: otCount + compCount,
        newEpoch,
      };
    })();
  }
}
