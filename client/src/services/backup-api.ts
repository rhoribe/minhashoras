import { getAuthHeader } from './auth.js';

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

export interface UpdateBackupScheduleInput {
  enabled?: boolean;
  frequency?: BackupFrequency;
  timeOfDay?: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  retentionCount?: number;
  targetDirectory?: string | null;
}

export interface BackupRun {
  id: string;
  scheduleId: string | null;
  triggerType: BackupTriggerType;
  status: BackupRunStatus;
  fileName: string | null;
  fileSizeBytes: number | null;
  checksumSha256: string | null;
  recordsCount: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt?: string;
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

function handleAuthError(res: Response, defaultMessage: string, errorData: any): void {
  if (res.status === 401) {
    throw new Error('Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.');
  }
  if (res.status === 403) {
    throw new Error('Acesso negado. Apenas administradores podem gerenciar backups do sistema.');
  }
  throw new Error(errorData?.message || defaultMessage);
}

export async function getBackupSchedule(): Promise<BackupSchedule> {
  const res = await fetch('/api/v1/backups/schedule', {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao consultar configuração de backup', errorData);
  }
  return res.json();
}

export async function updateBackupSchedule(input: UpdateBackupScheduleInput): Promise<BackupSchedule> {
  const res = await fetch('/api/v1/backups/schedule', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao atualizar rotina de backup', errorData);
  }
  return res.json();
}

export async function triggerManualBackup(): Promise<BackupRun> {
  const res = await fetch('/api/v1/backups/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({}),
  });

  if (res.status === 409) {
    throw new Error('Um processo de backup já está em andamento. Aguarde a finalização.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao iniciar backup manual', errorData);
  }

  return res.json();
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const res = await fetch('/api/v1/backups/status', {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao consultar status do backup', errorData);
  }
  return res.json();
}

export async function getBackupHistory(limit: number = 20, offset: number = 0): Promise<BackupHistoryResponse> {
  const res = await fetch(`/api/v1/backups/history?limit=${limit}&offset=${offset}`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao consultar histórico de backups', errorData);
  }
  return res.json();
}

export async function downloadBackup(id: string, defaultFileName?: string): Promise<void> {
  const res = await fetch(`/api/v1/backups/${id}/download`, {
    headers: {
      ...getAuthHeader(),
    },
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Arquivo de backup não encontrado ou já expurgado pela política de retenção.');
    }
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao realizar download do backup', errorData);
  }

  // Extract filename from Content-Disposition header if present
  let filename = defaultFileName || `minhashoras-backup-${id}.sqlite.gz`;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function restoreBackup(
  id: string,
  options?: { skipPreRestore?: boolean }
): Promise<RestoreBackupResult> {
  const res = await fetch(`/api/v1/backups/${id}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(options || {}),
  });

  if (res.status === 409) {
    throw new Error('Um processo de backup ou restauração já está em andamento. Aguarde a finalização.');
  }

  if (res.status === 404) {
    throw new Error('Arquivo de backup não encontrado ou já expurgado pela política de retenção.');
  }

  if (res.status === 422) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha de integridade no arquivo de backup. Operação abortada com segurança.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    handleAuthError(res, 'Falha ao restaurar banco de dados a partir do backup', errorData);
  }

  return res.json();
}
