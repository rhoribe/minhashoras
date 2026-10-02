<template>
  <aside
    class="hidden lg:flex flex-col w-64 shrink-0 bg-app-surface border-r border-app-border h-screen sticky top-0 z-30 transition-colors duration-200 select-none"
  >
    <!-- Brand Header -->
    <div class="p-5 border-b border-app-border flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-black text-white shadow-md shadow-brand-900/20 text-sm">
          MH
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-app-text-primary leading-tight">Minhas Horas</h1>
          <p class="text-[11px] text-app-text-muted">Banco de Horas & PWA</p>
        </div>
      </div>

      <!-- Network status badge -->
      <ConnectionStatusBadge />
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 group min-h-touch"
        :class="
          $route.path === item.path
            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-sm'
            : 'text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated'
        "
      >
        <component
          :is="item.icon"
          class="w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-110"
          :class="$route.path === item.path ? 'text-brand-600 dark:text-brand-400' : 'text-app-text-muted'"
        />
        <span class="tracking-tight text-sm">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Bottom Controls: Theme & User Identity -->
    <div class="p-4 border-t border-app-border space-y-4 bg-app-surface">
      <!-- Theme Switcher -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-app-text-muted">Aparência</span>
        <ThemeToggle />
      </div>

      <!-- User Profile & Logout -->
      <div v-if="authState.isAuthenticated.value" class="pt-2 border-t border-app-border/60 flex items-center justify-between">
        <div class="flex items-center space-x-3 overflow-hidden">
          <div
            class="w-9 h-9 rounded-full bg-app-surface-elevated text-app-text-primary font-bold text-xs flex items-center justify-center border border-app-border shrink-0 shadow-sm"
          >
            {{ authState.initials.value }}
          </div>
          <div class="truncate">
            <p class="text-xs font-bold text-app-text-primary truncate leading-tight">{{ authState.displayName.value }}</p>
            <p class="text-[11px] text-app-text-muted truncate">@{{ authState.user.value?.username }}</p>
          </div>
        </div>

        <button
          type="button"
          @click="handleLogout"
          class="p-2 rounded-xl text-app-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-h-touch min-w-touch flex items-center justify-center shrink-0"
          title="Sair da conta"
          aria-label="Sair da conta"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
import ThemeToggle from './ThemeToggle.vue';
import ConnectionStatusBadge from './ConnectionStatusBadge.vue';
import { authState, logout } from '../../services/auth.js';

const router = useRouter();

async function handleLogout() {
  await logout();
  router.push('/login');
}

const baseNavItems = [
  { label: 'Painel', path: '/', icon: LayoutDashboard },
  { label: 'Registros', path: '/records', icon: Clock },
  { label: 'Compensar', path: '/compensations', icon: CalendarCheck2 },
  { label: 'Relatórios', path: '/reports', icon: FileSpreadsheet },
  { label: 'Ajustes', path: '/settings', icon: Settings },
];

const navItems = computed(() => {
  if (authState.isAdmin.value) {
    return [
      ...baseNavItems,
      { label: 'Administração', path: '/admin', icon: ShieldAlert },
    ];
  }
  return baseNavItems;
});
</script>
