export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export type BackupTriggerType = 'automated' | 'manual';

export type BackupRunStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'purged';

export interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  timeOfDay: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  retentionCount: number;
  targetDirectory: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupScheduleRow {
  id: string;
  enabled: number;
  frequency: BackupFrequency;
  time_of_day: string;
  day_of_week: number | null;
  day_of_month: number | null;
  retention_count: number;
  target_directory: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRun {
  id: string;
  scheduleId: string | null;
  triggerType: BackupTriggerType;
  status: BackupRunStatus;
  fileName: string | null;
  filePath?: string | null;
  fileSizeBytes: number | null;
  checksumSha256: string | null;
  recordsCount: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt?: string;
}

export interface BackupRunRow {
  id: string;
  schedule_id: string | null;
  trigger_type: BackupTriggerType;
  status: BackupRunStatus;
  file_name: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  records_count: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface UpdateBackupScheduleInput {
  enabled?: boolean;
  frequency?: BackupFrequency;
  timeOfDay?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  retentionCount?: number;
  targetDirectory?: string | null;
}

export interface BackupStatus {
  isRunning: boolean;
  currentRun: BackupRun | null;
  lastRun: BackupRun | null;
  backupDirectory: string;
  isExternalAccessible: boolean;
}

export interface BackupHistoryResponse {
  total: number;
  runs: BackupRun[];
}

export function mapScheduleRowToDto(row: BackupScheduleRow): BackupSchedule {
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    frequency: row.frequency,
    timeOfDay: row.time_of_day,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    retentionCount: row.retention_count,
    targetDirectory: row.target_directory,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRunRowToDto(row: BackupRunRow): BackupRun {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    triggerType: row.trigger_type,
    status: row.status,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes,
    checksumSha256: row.checksum_sha256,
    recordsCount: row.records_count,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export interface RestoreBackupResult {
  success: boolean;
  message: string;
  restoredFromRun: {
    id: string;
    fileName: string | null;
    startedAt: string;
    recordsCount: number | null;
  };
  preRestoreRun: {
    id: string;
    fileName: string | null;
  };
}

export interface RestoreBackupOptions {
  skipPreRestore?: boolean;
}

