<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl sm:text-2xl font-extrabold text-app-text-primary tracking-tight">Emissão de Relatórios</h2>
      <p class="text-xs sm:text-sm text-app-text-muted">Exporte extratos detalhados e visualize o resumo do período</p>
    </div>

    <!-- Responsive Two-Column Grid on Desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Configuration & Formats (col-span-5) -->
      <div class="lg:col-span-5 space-y-5">
        <!-- Date Range Filter Card -->
        <div class="p-5 rounded-3xl bg-app-surface border border-app-border space-y-4 shadow-sm">
          <span class="text-xs font-bold text-app-text-muted uppercase tracking-wider block">Período de Referência</span>

          <!-- Presets -->
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="p in periodPresets"
              :key="p.label"
              type="button"
              @click="applyPreset(p)"
              class="py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center min-h-touch cursor-pointer"
              :class="activePreset === p.label ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' : 'bg-app-surface-elevated border-app-border text-app-text-secondary hover:bg-app-surface-elevated/80'"
            >
              {{ p.label }}
            </button>
          </div>

          <!-- Date pickers -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-[11px] font-medium text-app-text-muted mb-1.5">Data Início</label>
              <input
                v-model="startDate"
                type="date"
                @change="loadPreview"
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-app-text-primary text-xs focus:outline-none focus:border-emerald-500 min-h-touch"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-app-text-muted mb-1.5">Data Fim</label>
              <input
                v-model="endDate"
                type="date"
                @change="loadPreview"
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-app-text-primary text-xs focus:outline-none focus:border-emerald-500 min-h-touch"
              />
            </div>
          </div>
        </div>

        <!-- Export Action Options -->
        <div class="p-5 rounded-3xl bg-app-surface border border-app-border space-y-3 shadow-sm">
          <span class="text-xs font-bold text-app-text-muted uppercase tracking-wider block">Formatos Disponíveis</span>

          <!-- PDF Option -->
          <div
            @click="handleExport('pdf')"
            class="p-4 rounded-2xl bg-app-surface-elevated/60 border border-app-border hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition active:scale-[0.98] shadow-sm group min-h-touch"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500">
                <FileText class="w-5 h-5" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-app-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Documento PDF</h4>
                <p class="text-xs text-app-text-muted">Ideal para impressão e envio formal ao RH</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-app-text-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
          </div>

          <!-- Excel Option -->
          <div
            @click="handleExport('xlsx')"
            class="p-4 rounded-2xl bg-app-surface-elevated/60 border border-app-border hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition active:scale-[0.98] shadow-sm group min-h-touch"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
                <FileSpreadsheet class="w-5 h-5" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-app-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Planilha Excel (.xlsx)</h4>
                <p class="text-xs text-app-text-muted">Tabelas estilizadas com fórmulas automáticas</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-app-text-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
          </div>

          <!-- CSV Option -->
          <div
            @click="handleExport('csv')"
            class="p-4 rounded-2xl bg-app-surface-elevated/60 border border-app-border hover:border-emerald-500/50 flex items-center justify-between cursor-pointer transition active:scale-[0.98] shadow-sm group min-h-touch"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-500">
                <FileCode2 class="w-5 h-5" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-app-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Dados CSV (.csv)</h4>
                <p class="text-xs text-app-text-muted">Padrão universal compatível com qualquer software</p>
              </div>
            </div>
            <Download class="w-5 h-5 text-app-text-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
          </div>
        </div>

        <!-- Status message -->
        <div v-if="exportingMessage" class="p-3.5 rounded-2xl bg-app-surface border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium shadow-sm animate-pulse">
          {{ exportingMessage }}
        </div>
      </div>

      <!-- Right Column: Live Report Preview (col-span-7) -->
      <div class="lg:col-span-7 space-y-5">
        <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-app-text-muted uppercase tracking-wider block">Pré-visualização do Relatório</span>
              <h3 class="text-base font-bold text-app-text-primary mt-0.5">Extrato Consolidado</h3>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-xl bg-app-surface-elevated text-app-text-secondary border border-app-border">
              {{ previewRecords.length }} registros
            </span>
          </div>

          <!-- Summary Metric Cards -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-2xl bg-app-surface-elevated/70 border border-app-border">
              <span class="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider block">Total no Período</span>
              <span class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 block">
                +{{ formatMinutes(previewTotalMinutes) }}
              </span>
            </div>
            <div class="p-4 rounded-2xl bg-app-surface-elevated/70 border border-app-border">
              <span class="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider block">Média por Turno</span>
              <span class="text-xl sm:text-2xl font-black text-app-text-primary tracking-tight mt-1 block">
                {{ averagePreview }}
              </span>
            </div>
          </div>

          <!-- Preview Table -->
          <div v-if="previewRecords.length === 0" class="p-8 text-center rounded-2xl border border-dashed border-app-border text-xs text-app-text-muted bg-app-bg/50">
            Nenhum registro encontrado no período selecionado.
          </div>

          <div v-else class="overflow-hidden rounded-2xl border border-app-border bg-app-bg/50">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-app-border bg-app-surface-elevated text-[11px] font-bold text-app-text-muted uppercase">
                  <th class="py-2.5 px-3">Data</th>
                  <th class="py-2.5 px-3">Horário</th>
                  <th class="py-2.5 px-3 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-app-border text-xs text-app-text-primary">
                <tr
                  v-for="rec in previewRecords.slice(0, 8)"
                  :key="rec.id"
                  class="hover:bg-app-surface-elevated/30"
                >
                  <td class="py-2.5 px-3 whitespace-nowrap">{{ formatDate(rec.record_date) }}</td>
                  <td class="py-2.5 px-3 whitespace-nowrap text-app-text-secondary">{{ rec.start_time }} → {{ rec.end_time }}</td>
                  <td class="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +{{ formatMinutes(rec.net_overtime_minutes) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="previewRecords.length > 8" class="p-2 text-center text-[11px] text-app-text-muted border-t border-app-border">
              E mais {{ previewRecords.length - 8 }} registros inclusos no relatório completo...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileText, FileSpreadsheet, FileCode2, Download } from 'lucide-vue-next';
import { exportReport } from '../services/client-report-generator.js';
import { localDb, type LocalOvertimeRecord } from '../services/db.js';
import { getCurrentUserId } from '../services/auth.js';

const getMonthRange = (offsetMonths: number = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
  const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return { start: firstDay, end: lastDay };
};

const currentMonth = getMonthRange(0);
const startDate = ref(currentMonth.start);
const endDate = ref(currentMonth.end);
const activePreset = ref('Mês Atual');
const exportingMessage = ref('');
const previewRecords = ref<LocalOvertimeRecord[]>([]);

const periodPresets = [
  { label: 'Mês Atual', range: getMonthRange(0) },
  { label: 'Mês Anterior', range: getMonthRange(-1) },
  {
    label: 'Últimos 3 Meses',
    range: {
      start: getMonthRange(-2).start,
      end: getMonthRange(0).end,
    },
  },
];

const loadPreview = async () => {
  const userId = getCurrentUserId();
  const all = await localDb.overtimeRecords.where('user_id').equals(userId).toArray();
  previewRecords.value = all
    .filter(r => (!startDate.value || r.record_date >= startDate.value) && (!endDate.value || r.record_date <= endDate.value))
    .sort((a, b) => b.record_date.localeCompare(a.record_date));
};

onMounted(async () => {
  await loadPreview();
});

const previewTotalMinutes = computed(() => {
  return previewRecords.value.reduce((acc, r) => acc + (r.net_overtime_minutes || 0), 0);
});

const averagePreview = computed(() => {
  if (previewRecords.value.length === 0) return '0h 00m';
  const avg = Math.round(previewTotalMinutes.value / previewRecords.value.length);
  const hours = Math.floor(avg / 60);
  const mins = avg % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
});

const formatDate = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

const applyPreset = (preset: any) => {
  activePreset.value = preset.label;
  startDate.value = preset.range.start;
  endDate.value = preset.range.end;
  loadPreview();
};

const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
  if (!startDate.value || !endDate.value) {
    alert('Selecione as datas de início e fim.');
    return;
  }

  exportingMessage.value = `Gerando arquivo ${format.toUpperCase()}...`;
  try {
    await exportReport(format, startDate.value, endDate.value);
    exportingMessage.value = 'Download concluído com sucesso!';
  } catch (err: any) {
    exportingMessage.value = 'Erro ao exportar relatório: ' + err.message;
  } finally {
    setTimeout(() => {
      exportingMessage.value = '';
    }, 4000);
  }
};
</script>
