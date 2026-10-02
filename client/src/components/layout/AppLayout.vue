<template>
  <div class="min-h-screen bg-app-bg text-app-primary flex transition-colors duration-200 overflow-hidden">
    <!-- Desktop Left Navigation Sidebar (Only on viewports >= 1024px) -->
    <DesktopSidebar v-if="authState.isAuthenticated.value && $route.path !== '/login'" />

    <!-- App Content Layout Area -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
      <!-- Mobile Top App Bar (Hidden on desktop viewports) -->
      <header class="lg:hidden bg-app-surface/90 backdrop-blur-md border-b border-app-border px-4 py-3 flex items-center justify-between z-20 shrink-0 transition-colors duration-200">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-md shadow-brand-900/20 text-xs">
            MH
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-tight text-app-primary leading-tight">Minhas Horas</h1>
            <p class="text-[10px] text-app-text-muted">Banco de Horas & PWA</p>
          </div>
        </div>

        <!-- Right Controls: Status & User Session -->
        <div class="flex items-center space-x-2">
          <!-- Network & Sync Status Indicator -->
          <ConnectionStatusBadge />

          <!-- User Avatar & Logout Dropdown -->
          <div v-if="authState.isAuthenticated.value" class="relative">
            <button
              type="button"
              @click="showUserMenu = !showUserMenu"
              class="flex items-center justify-center w-8 h-8 rounded-full bg-app-surface-elevated text-app-primary font-bold text-xs border border-app-border hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all min-w-touch min-h-touch"
              :title="`Conectado como ${authState.displayName.value}`"
            >
              {{ authState.initials.value }}
            </button>

            <!-- Dropdown popover -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 mt-2 w-48 bg-app-surface rounded-2xl shadow-xl border border-app-border p-2 z-50 text-xs"
            >
              <div class="px-3 py-2 border-b border-app-border">
                <p class="font-bold text-app-primary truncate">{{ authState.displayName.value }}</p>
                <p class="text-app-text-muted truncate">@{{ authState.user.value?.username }}</p>
              </div>
              <router-link
                to="/settings"
                @click="showUserMenu = false"
                class="flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-touch"
              >
                <Settings class="w-4 h-4 text-slate-400" />
                <span>Preferências</span>
              </router-link>
              <router-link
                v-if="authState.isAdmin.value"
                to="/admin"
                @click="showUserMenu = false"
                class="flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-semibold min-h-touch"
              >
                <ShieldAlert class="w-4 h-4 text-purple-500" />
                <span>Painel Admin</span>
              </router-link>
              <button
                type="button"
                @click="handleLogout"
                class="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 min-h-touch transition-colors"
              >
                <LogOut class="w-4 h-4" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- PWA Install Banner -->
      <InstallPromptModal />

      <!-- Scrollable Main Content: Responsive Container max-w-7xl on desktop -->
      <main
        class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto space-y-6"
        :class="authState.isAuthenticated.value ? 'pb-24 lg:pb-8' : 'pb-6'"
      >
        <OfflineNotificationBanner />
        <slot />
      </main>

      <!-- Mobile Bottom Navigation Bar (Hidden on desktop viewports) -->
      <nav
        v-if="authState.isAuthenticated.value && $route.path !== '/login'"
        class="lg:hidden fixed bottom-0 left-0 right-0 bg-app-surface/95 backdrop-blur-lg border-t border-app-border px-2 py-1 pb-safe-bottom z-30 flex items-center justify-around transition-colors duration-200"
      >
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center min-w-touch min-h-touch py-1 px-2 rounded-xl transition-all duration-150"
          :class="$route.path === item.path ? 'text-brand-600 dark:text-brand-400 font-semibold scale-105' : 'text-app-text-muted hover:text-app-primary'"
        >
          <component :is="item.icon" class="w-5 h-5 mb-0.5" />
          <span class="text-[11px] tracking-tight">{{ item.label }}</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck2,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  LogOut,
} from 'lucide-vue-next';
import InstallPromptModal from './InstallPromptModal.vue';
import DesktopSidebar from './DesktopSidebar.vue';
import ConnectionStatusBadge from './ConnectionStatusBadge.vue';
import OfflineNotificationBanner from './OfflineNotificationBanner.vue';
import { authState, logout } from '../../services/auth.js';

const router = useRouter();
const showUserMenu = ref(false);

async function handleLogout() {
  showUserMenu.value = false;
  await logout();
  router.push('/login');
}

const navItems = [
  { label: 'Painel', path: '/', icon: LayoutDashboard },
  { label: 'Registros', path: '/records', icon: Clock },
  { label: 'Compensar', path: '/compensations', icon: CalendarCheck2 },
  { label: 'Relatórios', path: '/reports', icon: FileSpreadsheet },
  { label: 'Ajustes', path: '/settings', icon: Settings },
];
</script>
