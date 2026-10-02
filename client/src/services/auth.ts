import { ref, computed } from 'vue';
import { localDb, clearAllLocalData } from './db.js';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
  must_change_password?: boolean;
  created_at?: string;
}

export interface ChangePasswordRequest {
  new_password: string;
}

export interface UserPreferences {
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system';
  daily_standard_work_minutes: number;
  max_positive_limit_minutes: number;
  max_negative_limit_minutes: number;
  warning_threshold_percentage: number;
}

const STORAGE_KEY_TOKEN = 'minhas_horas_auth_token';
const STORAGE_KEY_USER = 'minhas_horas_user';

const token = ref<string | null>(localStorage.getItem(STORAGE_KEY_TOKEN));
const user = ref<User | null>(
  localStorage.getItem(STORAGE_KEY_USER)
    ? JSON.parse(localStorage.getItem(STORAGE_KEY_USER)!)
    : null
);
const preferences = ref<UserPreferences | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

export const authState = {
  token,
  user,
  preferences,
  isLoading,
  error,
  isAuthenticated: computed(() => !!token.value && !!user.value),
  isAdmin: computed(() => user.value?.role === 'admin'),
  displayName: computed(() => user.value?.display_name || user.value?.username || 'Usuário'),
  initials: computed(() => {
    if (!user.value) return 'MH';
    const parts = (user.value.display_name || user.value.username).trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }),
};

export async function login(loginInput: string, passwordInput: string): Promise<boolean> {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginInput, password: passwordInput }),
    });

    const data = await res.json();
    if (!res.ok) {
      error.value = data.message || 'Falha ao autenticar. Verifique suas credenciais.';
      return false;
    }

    token.value = data.token;
    user.value = data.user;
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    try {
      await localDb.activeSession.put({
        id: 'current',
        user_id: data.user.id,
        token: data.token,
        user: data.user,
        cached_at: new Date().toISOString()
      });
    } catch {}

    return true;
  } catch (err: any) {
    error.value = 'Erro de conexão com o servidor. Tente novamente.';
    return false;
  } finally {
    isLoading.value = false;
  }
}

export async function register(formData: {
  username: string;
  email: string;
  password: string;
  display_name: string;
}): Promise<boolean> {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      error.value = data.message || 'Falha ao criar conta. Verifique os dados.';
      return false;
    }

    token.value = data.token;
    user.value = data.user;
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    try {
      await localDb.activeSession.put({
        id: 'current',
        user_id: data.user.id,
        token: data.token,
        user: data.user,
        cached_at: new Date().toISOString()
      });
    } catch {}

    return true;
  } catch (err: any) {
    error.value = 'Erro de conexão com o servidor. Tente novamente.';
    return false;
  } finally {
    isLoading.value = false;
  }
}

export async function fetchCurrentUser(): Promise<boolean> {
  if (!token.value) return false;

  // If client is currently offline, retain cached user session
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return !!user.value;
  }

  try {
    const res = await fetch('/api/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });

    if (res.status === 401) {
      logout();
      return false;
    }

    if (!res.ok) return false;

    const data = await res.json();
    user.value = data.user;
    preferences.value = data.preferences;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
    return true;
  } catch {
    // In case of network timeout, keep local session valid
    return !!user.value;
  }
}

export async function logout(): Promise<void> {
  if (token.value) {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }

  token.value = null;
  user.value = null;
  preferences.value = null;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  try {
    await localDb.activeSession.clear();
  } catch {}
}

export async function changePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
  if (!token.value) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ new_password: newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.error || data.message || 'Falha ao atualizar a senha.';
      error.value = errMsg;
      return { success: false, message: errMsg };
    }

    if (data.user) {
      user.value = {
        ...user.value,
        ...data.user,
        must_change_password: false,
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user.value));
      try {
        await localDb.activeSession.put({
          id: 'current',
          user_id: user.value.id,
          token: token.value!,
          user: user.value,
          cached_at: new Date().toISOString(),
        });
      } catch {}
    }

    return { success: true, message: data.message || 'Senha alterada com sucesso.' };
  } catch (err: any) {
    const errMsg = 'Erro de conexão com o servidor. Tente novamente.';
    error.value = errMsg;
    return { success: false, message: errMsg };
  } finally {
    isLoading.value = false;
  }
}

export async function deleteSelfAccount(): Promise<{ success: boolean; message?: string }> {
  if (!token.value) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch('/api/v1/auth/me', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.error || data.message || 'Falha ao excluir a conta.';
      error.value = errMsg;
      return { success: false, message: errMsg };
    }

    // Wipe client storage
    token.value = null;
    user.value = null;
    preferences.value = null;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    await clearAllLocalData();

    return { success: true, message: data.message };
  } catch (err: any) {
    const errMsg = 'Erro de conexão com o servidor. Tente novamente.';
    error.value = errMsg;
    return { success: false, message: errMsg };
  } finally {
    isLoading.value = false;
  }
}

export function getAuthHeader(): Record<string, string> {
  if (token.value) {
    return { Authorization: `Bearer ${token.value}` };
  }
  return {};
}

export function getCurrentUserId(): string {
  return user.value?.id || 'default_user';
}
