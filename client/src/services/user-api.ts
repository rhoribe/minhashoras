import { getAuthHeader } from './auth.js';
import { clearLocalUserRecords } from './db.js';

export interface ResetUserRecordsResponse {
  success: boolean;
  message: string;
  purgedRecordsCount: number;
  purgedCompensationsCount: number;
  resetAt: string;
}

export async function exportPersonalBackup(): Promise<void> {
  const headers = getAuthHeader();
  const response = await fetch('/api/v1/user/export-backup', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Falha ao baixar backup pessoal.');
  }

  // Extract filename from Content-Disposition if present
  let filename = 'minhashoras-backup.json';
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function resetPersonalRecords(userId: string): Promise<ResetUserRecordsResponse> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };

  const response = await fetch('/api/v1/user/reset-records', {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirmation: 'ZERAR-MEUS-REGISTROS' }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Falha ao zerar registros.');
  }

  // Clear local IndexedDB records for this user
  if (userId) {
    await clearLocalUserRecords(userId);
  }

  return data;
}
