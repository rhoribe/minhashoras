import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { db as defaultDb } from '../db/connection.js';
import {
  BackupHistoryResponse,
  BackupRun,
  BackupRunRow,
  BackupRunStatus,
  BackupSchedule,
  BackupScheduleRow,
  BackupTriggerType,
  mapRunRowToDto,
  mapScheduleRowToDto,
  UpdateBackupScheduleInput,
} from '../types/backup.js';

export interface CreateRunInput {
  id?: string;
  scheduleId?: string | null;
  triggerType: BackupTriggerType;
  status?: BackupRunStatus;
  startedAt?: string;
}

export interface UpdateRunInput {
  status: BackupRunStatus;
  fileName?: string | null;
  filePath?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
  recordsCount?: number | null;
  errorMessage?: string | null;
  completedAt?: string | null;
}

export class BackupRepository {
  private database: Database.Database;

  constructor(database: Database.Database = defaultDb) {
    this.database = database;
  }

  getSchedule(id: string = 'default'): BackupSchedule | null {
    const row = this.database
      .prepare('SELECT * FROM backup_schedules WHERE id = ?')
      .get(id) as BackupScheduleRow | undefined;

    return row ? mapScheduleRowToDto(row) : null;
  }

  updateSchedule(id: string = 'default', input: UpdateBackupScheduleInput & { nextRunAt?: string | null }): BackupSchedule {
    const existing = this.getSchedule(id);
    if (!existing) {
      throw new Error(`Backup schedule '${id}' not found`);
    }

    const enabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);
    const frequency = input.frequency ?? existing.frequency;
    const timeOfDay = input.timeOfDay ?? existing.timeOfDay;
    const dayOfWeek = input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek;
    const dayOfMonth = input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth;
    const retentionCount = input.retentionCount ?? existing.retentionCount;
    const targetDirectory = input.targetDirectory !== undefined ? input.targetDirectory : existing.targetDirectory;
    const nextRunAt = input.nextRunAt !== undefined ? input.nextRunAt : existing.nextRunAt;
    const now = new Date().toISOString();

    this.database
      .prepare(`
        UPDATE backup_schedules
        SET enabled = ?,
            frequency = ?,
            time_of_day = ?,
            day_of_week = ?,
            day_of_month = ?,
            retention_count = ?,
            target_directory = ?,
            next_run_at = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .run(
        enabled,
        frequency,
        timeOfDay,
        dayOfWeek,
        dayOfMonth,
        retentionCount,
        targetDirectory,
        nextRunAt,
        now,
        id
      );

    const updated = this.getSchedule(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated schedule');
    }
    return updated;
  }

  updateScheduleRunTimestamps(id: string = 'default', lastRunAt: string, nextRunAt: string | null): void {
    this.database
      .prepare(`
        UPDATE backup_schedules
        SET last_run_at = ?,
            next_run_at = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .run(lastRunAt, nextRunAt, new Date().toISOString(), id);
  }

  createRun(input: CreateRunInput): BackupRun {
    const id = input.id || uuidv4();
    const scheduleId = input.scheduleId || null;
    const triggerType = input.triggerType;
    const status: BackupRunStatus = input.status || 'pending';
    const startedAt = input.startedAt || new Date().toISOString();
    const now = new Date().toISOString();

    this.database
      .prepare(`
        INSERT INTO backup_runs (
          id, schedule_id, trigger_type, status, started_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(id, scheduleId, triggerType, status, startedAt, now);

    const created = this.getRunById(id);
    if (!created) {
      throw new Error('Failed to retrieve created backup run');
    }
    return created;
  }

  updateRun(id: string, input: UpdateRunInput): BackupRun {
    const existing = this.getRunById(id);
    if (!existing) {
      throw new Error(`Backup run '${id}' not found`);
    }

    const status = input.status !== undefined ? input.status : existing.status;
    const fileName = input.fileName !== undefined ? input.fileName : existing.fileName;
    const filePath = input.filePath !== undefined ? input.filePath : (existing.filePath || null);
    const fileSizeBytes = input.fileSizeBytes !== undefined ? input.fileSizeBytes : existing.fileSizeBytes;
    const checksumSha256 = input.checksumSha256 !== undefined ? input.checksumSha256 : existing.checksumSha256;

    const recordsCount = input.recordsCount !== undefined ? input.recordsCount : existing.recordsCount;
    const errorMessage = input.errorMessage !== undefined ? input.errorMessage : existing.errorMessage;
    const completedAt = input.completedAt !== undefined ? input.completedAt : existing.completedAt;

    this.database
      .prepare(`
        UPDATE backup_runs
        SET status = ?,
            file_name = ?,
            file_path = ?,
            file_size_bytes = ?,
            checksum_sha256 = ?,
            records_count = ?,
            error_message = ?,
            completed_at = ?
        WHERE id = ?
      `)
      .run(
        status,
        fileName,
        filePath,
        fileSizeBytes,
        checksumSha256,
        recordsCount,
        errorMessage,
        completedAt,
        id
      );

    const updated = this.getRunById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated backup run');
    }
    return updated;
  }

  getRunById(id: string): BackupRun | null {
    const row = this.database
      .prepare('SELECT * FROM backup_runs WHERE id = ?')
      .get(id) as BackupRunRow | undefined;

    return row ? mapRunRowToDto(row) : null;
  }

  getActiveRun(): BackupRun | null {
    const row = this.database
      .prepare(`
        SELECT * FROM backup_runs
        WHERE status IN ('pending', 'in_progress')
        ORDER BY started_at DESC
        LIMIT 1
      `)
      .get() as BackupRunRow | undefined;

    return row ? mapRunRowToDto(row) : null;
  }

  cleanupOrphanRuns(): number {
    const result = this.database
      .prepare(`
        UPDATE backup_runs
        SET status = 'failed',
            error_message = 'Interrupted: Server process terminated unexpectedly during execution',
            completed_at = datetime('now')
        WHERE status IN ('pending', 'in_progress')
      `)
      .run();

    return result.changes;
  }

  getLastCompletedRun(): BackupRun | null {
    const row = this.database
      .prepare(`
        SELECT * FROM backup_runs
        WHERE status = 'completed'
        ORDER BY started_at DESC
        LIMIT 1
      `)
      .get() as BackupRunRow | undefined;

    return row ? mapRunRowToDto(row) : null;
  }

  listRuns(limit: number = 20, offset: number = 0): BackupHistoryResponse {
    const totalRow = this.database
      .prepare('SELECT COUNT(*) as count FROM backup_runs')
      .get() as { count: number };

    const rows = this.database
      .prepare(`
        SELECT * FROM backup_runs
        ORDER BY started_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(limit, offset) as BackupRunRow[];

    return {
      total: totalRow.count,
      runs: rows.map(mapRunRowToDto),
    };
  }

  findRetentionCandidates(retentionCount: number, excludeIds: string[] = []): BackupRun[] {
    if (retentionCount < 1) {
      retentionCount = 1;
    }

    const rows = this.database
      .prepare(`
        SELECT * FROM backup_runs
        WHERE status = 'completed'
        ORDER BY started_at DESC
        LIMIT -1 OFFSET ?
      `)
      .all(retentionCount) as BackupRunRow[];

    const candidates = rows.map(mapRunRowToDto);
    if (excludeIds.length > 0) {
      return candidates.filter((c) => !excludeIds.includes(c.id));
    }
    return candidates;
  }


  markRunAsPurged(id: string): BackupRun {
    return this.updateRun(id, {
      status: 'purged',
    });
  }

  countTotalRecords(): number {
    try {
      const recordsCount = (this.database
        .prepare('SELECT COUNT(*) as count FROM overtime_records')
        .get() as { count: number }).count;

      const compCount = (this.database
        .prepare('SELECT COUNT(*) as count FROM compensation_schedules')
        .get() as { count: number }).count;

      return recordsCount + compCount;
    } catch {
      return 0;
    }
  }
}

export const backupRepository = new BackupRepository();
