import { ref, computed } from 'vue';
import { getAuthHeader } from './auth.js';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'minhas_horas_theme';

const currentTheme = ref<ThemeMode>(
  (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
);

const systemIsDark = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
);

const isDark = computed(() => {
  if (currentTheme.value === 'dark') return true;
  if (currentTheme.value === 'light') return false;
  return systemIsDark.value;
});

function applyThemeToDOM(dark: boolean) {
  if (typeof document !== 'undefined') {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export function setTheme(mode: ThemeMode) {
  currentTheme.value = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  applyThemeToDOM(isDark.value);

  // Sync with server if logged in
  const headers = getAuthHeader();
  if (Object.keys(headers).length > 0) {
    fetch('/api/v1/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ theme_mode: mode }),
    }).catch(() => {});
  }
}

export function initTheme() {
  if (typeof window === 'undefined') return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemIsDark.value = mediaQuery.matches;

  mediaQuery.addEventListener('change', (e) => {
    systemIsDark.value = e.matches;
    if (currentTheme.value === 'system') {
      applyThemeToDOM(e.matches);
    }
  });

  applyThemeToDOM(isDark.value);
}

export const themeState = {
  currentTheme,
  isDark,
};
