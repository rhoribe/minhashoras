import { authState } from './auth.js';

export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  active_sessions_count: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  display_name: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserRequest {
  display_name?: string;
  email?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface AccessAuditLogDto {
  id: string;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string;
}

export interface AdminActiveSessionDto {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  is_current_session: boolean;
}

export interface SystemUsageMetricsDto {
  summary: {
    total_users: number;
    active_users: number;
    total_overtime_minutes: number;
    total_compensation_minutes: number;
    net_balance_minutes: number;
    total_entries_count: number;
  };
  users: Array<{
    user_id: string;
    username: string;
    display_name: string;
    role: 'admin' | 'user';
    is_active: boolean;
    overtime_minutes: number;
    compensation_minutes: number;
    net_balance_minutes: number;
    entries_count: number;
    last_entry_date: string | null;
  }>;
}

function getAuthHeaders(): HeadersInit {
  const token = authState.token.value || localStorage.getItem('minhas_horas_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchUsers(): Promise<AdminUserDto[]> {
  const res = await fetch('/api/v1/admin/users', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao carregar usuários.' }));
    throw new Error(err.message || 'Erro ao carregar usuários.');
  }
  const data = await res.json();
  return data.users;
}

export async function createAdminUser(payload: CreateUserRequest): Promise<AdminUserDto> {
  const res = await fetch('/api/v1/admin/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao criar usuário.');
  }
  return data.user;
}

export async function updateAdminUser(id: string, payload: UpdateUserRequest): Promise<AdminUserDto> {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao atualizar usuário.');
  }
  return data.user;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}/reset-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao redefinir senha.');
  }
}

export async function deleteAdminUser(id: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao remover usuário.');
  }
}

export async function fetchAccessLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ logs: AccessAuditLogDto[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.event_type) searchParams.set('event_type', params.event_type);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);

  const res = await fetch(`/api/v1/admin/access-logs?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao carregar logs de acesso.' }));
    throw new Error(err.message || 'Erro ao carregar logs de acesso.');
  }
  return await res.json();
}

export async function fetchActiveSessions(): Promise<AdminActiveSessionDto[]> {
  const res = await fetch('/api/v1/admin/sessions', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao carregar sessões ativas.' }));
    throw new Error(err.message || 'Erro ao carregar sessões ativas.');
  }
  const data = await res.json();
  return data.sessions;
}

export async function revokeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao revogar sessão.');
  }
}

export async function fetchUsageReports(startDate?: string, endDate?: string): Promise<SystemUsageMetricsDto> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set('start_date', startDate);
  if (endDate) searchParams.set('end_date', endDate);

  const res = await fetch(`/api/v1/admin/reports/usage?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Erro ao carregar relatórios de uso.' }));
    throw new Error(err.message || 'Erro ao carregar relatórios de uso.');
  }
  return await res.json();
}

export async function exportUsageCsv(startDate?: string, endDate?: string): Promise<void> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.set('start_date', startDate);
  if (endDate) searchParams.set('end_date', endDate);

  const token = authState.token.value || localStorage.getItem('minhas_horas_auth_token');
  const res = await fetch(`/api/v1/admin/reports/usage/export?${searchParams.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error('Falha ao exportar relatório CSV.');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `relatorio-consolidado-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export interface SystemResetRequest {
  confirmation: string;
  deleteBackups?: boolean;
}

export interface SystemResetResult {
  success: boolean;
  message: string;
  wipedRecordsCount: number;
  wipedBackupsCount: number;
  epoch: string;
  resetAt: string;
}

export async function executeSystemReset(request: SystemResetRequest): Promise<SystemResetResult> {
  const res = await fetch('/api/v1/admin/system/reset', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Erro ao executar restauração do sistema.');
  }
  return data;
}
