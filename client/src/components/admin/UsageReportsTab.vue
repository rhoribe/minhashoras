<template>
  <div class="space-y-6">
    <!-- Header / Date Range Filters & Export -->
    <div class="bg-app-surface rounded-2xl border border-app-border p-5 space-y-4 shadow-sm">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-app-text-primary flex items-center space-x-2">
            <BarChart2 class="w-5 h-5 text-brand-600" />
            <span>Relatórios Consolidados de Uso</span>
          </h2>
          <p class="text-xs text-app-text-muted mt-0.5">
            Métricas de horas extras, compensações e balanço geral de toda a equipe.
          </p>
        </div>

        <!-- Date Filters & Actions -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="flex items-center space-x-1.5">
            <span class="text-xs font-semibold text-app-text-muted">De:</span>
            <input
              v-model="startDate"
              type="date"
              class="px-2.5 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-xs focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="flex items-center space-x-1.5">
            <span class="text-xs font-semibold text-app-text-muted">Até:</span>
            <input
              v-model="endDate"
              type="date"
              class="px-2.5 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-xs focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <button
            type="button"
            @click="loadReports"
            :disabled="isLoading"
            class="px-3.5 py-2 rounded-xl bg-app-surface-elevated hover:bg-app-border text-app-text-primary text-xs font-semibold min-h-touch transition-colors"
          >
            Filtrar
          </button>

          <button
            type="button"
            @click="handleExportCsv"
            :disabled="isExporting"
            class="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm active:scale-95 min-h-touch min-w-touch transition-all disabled:opacity-50"
          >
            <Download class="w-3.5 h-3.5" />
            <span>{{ isExporting ? 'Exportando...' : 'Exportar CSV' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="errorMessage" class="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 text-red-600 text-sm flex items-center justify-between">
      <span>{{ errorMessage }}</span>
      <button type="button" @click="errorMessage = null" class="p-1">✕</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 text-center text-app-text-muted text-sm flex flex-col items-center justify-center space-y-2">
      <Loader2 class="w-7 h-7 animate-spin text-brand-600" />
      <p>Compilando relatórios e métricas consolidadas...</p>
    </div>

    <div v-else-if="metrics" class="space-y-6">
      <!-- KPI Metric Cards Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <!-- Overtime Hours -->
        <div class="p-4 rounded-2xl border border-app-border bg-app-surface space-y-1">
          <div class="flex items-center justify-between text-app-text-muted">
            <span class="text-xs font-semibold">Horas Extras</span>
            <Clock class="w-4 h-4 text-brand-600" />
          </div>
          <p class="text-xl font-bold text-app-text-primary">
            {{ formatMinutes(metrics.summary.total_overtime_minutes) }}
          </p>
          <p class="text-[11px] text-app-text-muted">Total acumulado</p>
        </div>

        <!-- Compensations Hours -->
        <div class="p-4 rounded-2xl border border-app-border bg-app-surface space-y-1">
          <div class="flex items-center justify-between text-app-text-muted">
            <span class="text-xs font-semibold">Compensadas</span>
            <CalendarCheck class="w-4 h-4 text-amber-500" />
          </div>
          <p class="text-xl font-bold text-app-text-primary">
            {{ formatMinutes(metrics.summary.total_compensation_minutes) }}
          </p>
          <p class="text-[11px] text-app-text-muted">Horas usufruídas</p>
        </div>

        <!-- Net Balance -->
        <div class="p-4 rounded-2xl border border-app-border bg-app-surface space-y-1">
          <div class="flex items-center justify-between text-app-text-muted">
            <span class="text-xs font-semibold">Saldo Líquido</span>
            <TrendingUp v-if="metrics.summary.net_balance_minutes >= 0" class="w-4 h-4 text-emerald-500" />
            <TrendingDown v-else class="w-4 h-4 text-rose-500" />
          </div>
          <p
            class="text-xl font-bold"
            :class="metrics.summary.net_balance_minutes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ formatMinutes(metrics.summary.net_balance_minutes) }}
          </p>
          <p class="text-[11px] text-app-text-muted">Balanço do sistema</p>
        </div>

        <!-- Team & Activity -->
        <div class="p-4 rounded-2xl border border-app-border bg-app-surface space-y-1">
          <div class="flex items-center justify-between text-app-text-muted">
            <span class="text-xs font-semibold">Usuários Ativos</span>
            <Users class="w-4 h-4 text-indigo-500" />
          </div>
          <p class="text-xl font-bold text-app-text-primary">
            {{ metrics.summary.active_users }} <span class="text-xs font-normal text-app-text-muted">/ {{ metrics.summary.total_users }}</span>
          </p>
          <p class="text-[11px] text-app-text-muted">{{ metrics.summary.total_entries_count }} lançamentos</p>
        </div>
      </div>

      <!-- Per-User Breakdown Table (Desktop) / Cards (Mobile) -->
      <div class="bg-app-surface rounded-2xl border border-app-border overflow-hidden shadow-sm space-y-0">
        <div class="p-4 border-b border-app-border bg-app-surface-elevated/40">
          <h3 class="text-sm font-bold text-app-text-primary">Detalhamento por Colaborador</h3>
        </div>

        <!-- Desktop View (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-app-surface-elevated/70 border-b border-app-border text-xs text-app-text-muted uppercase tracking-wider">
              <tr>
                <th class="px-5 py-3 font-semibold">Colaborador</th>
                <th class="px-5 py-3 font-semibold">Papel</th>
                <th class="px-5 py-3 font-semibold">Horas Extras</th>
                <th class="px-5 py-3 font-semibold">Compensadas</th>
                <th class="px-5 py-3 font-semibold">Saldo Líquido</th>
                <th class="px-5 py-3 font-semibold text-center">Lançamentos</th>
                <th class="px-5 py-3 font-semibold text-right">Último Lançamento</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border text-app-text-primary">
              <tr v-for="u in metrics.users" :key="u.user_id" class="hover:bg-app-surface-elevated/40 transition-colors">
                <td class="px-5 py-3.5">
                  <div>
                    <p class="font-bold text-app-text-primary">{{ u.display_name }}</p>
                    <p class="text-xs text-app-text-muted">@{{ u.username }}</p>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    :class="u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                  >
                    {{ u.role === 'admin' ? 'Administrador' : 'Colaborador' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 font-medium text-app-text-secondary">
                  {{ formatMinutes(u.overtime_minutes) }}
                </td>
                <td class="px-5 py-3.5 font-medium text-amber-600 dark:text-amber-400">
                  {{ formatMinutes(u.compensation_minutes) }}
                </td>
                <td class="px-5 py-3.5 font-bold" :class="u.net_balance_minutes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                  {{ formatMinutes(u.net_balance_minutes) }}
                </td>
                <td class="px-5 py-3.5 text-center text-app-text-secondary">
                  {{ u.entries_count }}
                </td>
                <td class="px-5 py-3.5 text-right text-xs text-app-text-muted">
                  {{ u.last_entry_date ? formatDateOnly(u.last_entry_date) : 'Nenhum' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-app-border">
          <div v-for="u in metrics.users" :key="u.user_id" class="p-4 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-app-text-primary text-sm">{{ u.display_name }}</p>
                <p class="text-xs text-app-text-muted">@{{ u.username }}</p>
              </div>
              <span
                class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                :class="u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
              >
                {{ u.role === 'admin' ? 'Admin' : 'Usuário' }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div class="bg-app-surface-elevated/40 p-2 rounded-xl">
                <span class="text-app-text-muted block text-[10px]">Extras</span>
                <span class="font-semibold text-app-text-primary">{{ formatMinutes(u.overtime_minutes) }}</span>
              </div>
              <div class="bg-app-surface-elevated/40 p-2 rounded-xl">
                <span class="text-app-text-muted block text-[10px]">Comp.</span>
                <span class="font-semibold text-amber-600">{{ formatMinutes(u.compensation_minutes) }}</span>
              </div>
              <div class="bg-app-surface-elevated/40 p-2 rounded-xl">
                <span class="text-app-text-muted block text-[10px]">Saldo</span>
                <span class="font-bold" :class="u.net_balance_minutes >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ formatMinutes(u.net_balance_minutes) }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-app-text-muted pt-1">
              <span>{{ u.entries_count }} lançamentos</span>
              <span>Último: {{ u.last_entry_date ? formatDateOnly(u.last_entry_date) : 'Nenhum' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  BarChart2,
  Clock,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  Loader2,
} from 'lucide-vue-next';
import {
  fetchUsageReports,
  exportUsageCsv,
  SystemUsageMetricsDto,
} from '../../services/admin.js';

const metrics = ref<SystemUsageMetricsDto | null>(null);
const isLoading = ref(true);
const isExporting = ref(false);
const errorMessage = ref<string | null>(null);

const startDate = ref('');
const endDate = ref('');

function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatDateOnly(dateStr: string): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

async function loadReports() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    metrics.value = await fetchUsageReports(
      startDate.value || undefined,
      endDate.value || undefined
    );
  } catch (err: any) {
    errorMessage.value = err.message || 'Erro ao carregar relatórios de uso.';
  } finally {
    isLoading.value = false;
  }
}

async function handleExportCsv() {
  isExporting.value = true;
  try {
    await exportUsageCsv(
      startDate.value || undefined,
      endDate.value || undefined
    );
  } catch (err: any) {
    errorMessage.value = err.message || 'Falha ao exportar relatório CSV.';
  } finally {
    isExporting.value = false;
  }
}

onMounted(() => {
  loadReports();
});
</script>
