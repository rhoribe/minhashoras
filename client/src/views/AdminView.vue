<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center space-x-2">
          <ShieldAlert class="w-6 h-6 text-brand-600" />
          <h1 class="text-2xl font-bold tracking-tight text-app-text-primary">Painel de Administração</h1>
        </div>
        <p class="text-sm text-app-text-muted mt-1">
          Gerenciamento central de usuários, auditoria de acessos e relatórios operacionais consolidados.
        </p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center border-b border-app-border space-x-1 overflow-x-auto pb-px">
      <button
        type="button"
        @click="activeTab = 'users'"
        class="inline-flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-touch whitespace-nowrap"
        :class="activeTab === 'users' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-app-text-muted hover:text-app-text-primary hover:border-app-border'"
      >
        <Users class="w-4 h-4" />
        <span>Usuários</span>
      </button>

      <button
        type="button"
        @click="activeTab = 'audit'"
        class="inline-flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-touch whitespace-nowrap"
        :class="activeTab === 'audit' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-app-text-muted hover:text-app-text-primary hover:border-app-border'"
      >
        <KeyRound class="w-4 h-4" />
        <span>Acessos & Sessões</span>
      </button>

      <button
        type="button"
        @click="activeTab = 'reports'"
        class="inline-flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-touch whitespace-nowrap"
        :class="activeTab === 'reports' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-app-text-muted hover:text-app-text-primary hover:border-app-border'"
      >
        <BarChart3 class="w-4 h-4" />
        <span>Relatórios Globais</span>
      </button>

      <button
        type="button"
        @click="activeTab = 'system'"
        class="inline-flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all min-h-touch whitespace-nowrap"
        :class="activeTab === 'system' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-app-text-muted hover:text-red-600 hover:border-app-border'"
      >
        <Wrench class="w-4 h-4" />
        <span>Sistema & Manutenção</span>
      </button>
    </div>

    <!-- Tab Contents -->
    <div>
      <UserManagementTab v-if="activeTab === 'users'" />
      <AccessAuditingTab v-else-if="activeTab === 'audit'" />
      <UsageReportsTab v-else-if="activeTab === 'reports'" />
      <SystemMaintenanceTab v-else-if="activeTab === 'system'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ShieldAlert, Users, KeyRound, BarChart3, Wrench } from 'lucide-vue-next';
import UserManagementTab from '../components/admin/UserManagementTab.vue';
import AccessAuditingTab from '../components/admin/AccessAuditingTab.vue';
import UsageReportsTab from '../components/admin/UsageReportsTab.vue';
import SystemMaintenanceTab from '../components/admin/SystemMaintenanceTab.vue';

const activeTab = ref<'users' | 'audit' | 'reports' | 'system'>('users');
</script>
