<template>
  <div>
    <!-- Empty State -->
    <div v-if="records.length === 0" class="text-center py-12 px-4 rounded-3xl border border-dashed border-app-border bg-app-surface/50">
      <Clock class="w-10 h-10 text-app-text-muted mx-auto mb-2 opacity-50" />
      <h3 class="text-sm font-semibold text-app-text-primary">Nenhum registro encontrado</h3>
      <p class="text-xs text-app-text-muted mt-1">Toque no botão para adicionar suas horas extras.</p>
    </div>

    <div v-else>
      <!-- Mobile View (< md): Touch Cards -->
      <div class="space-y-3 md:hidden">
        <RecordCard
          v-for="record in records"
          :key="record.id"
          :record="record"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>

      <!-- Desktop View (>= md): Responsive Data Table -->
      <div class="hidden md:block overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-app-border bg-app-surface-elevated/60 text-[11px] font-bold text-app-text-muted uppercase tracking-wider">
              <th scope="col" class="py-3.5 px-4 font-semibold">Data</th>
              <th scope="col" class="py-3.5 px-4 font-semibold">Horário</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Intervalo</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-right">Total Líquido</th>
              <th scope="col" class="py-3.5 px-4 font-semibold">Categoria</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Status</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border text-xs text-app-text-primary">
            <tr
              v-for="record in records"
              :key="record.id"
              class="hover:bg-app-surface-elevated/40 transition-colors"
            >
              <!-- Data -->
              <td class="py-3.5 px-4 font-medium whitespace-nowrap">
                {{ formatDate(record.record_date) }}
                <div v-if="record.description" class="text-[11px] text-app-text-muted max-w-xs truncate" :title="record.description">
                  {{ record.description }}
                </div>
              </td>

              <!-- Horário -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="font-semibold">{{ record.start_time }} → {{ record.end_time }}</span>
                <span v-if="checkOvernight(record)" class="ml-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  (vira noite)
                </span>
              </td>

              <!-- Intervalo -->
              <td class="py-3.5 px-4 text-center text-app-text-muted whitespace-nowrap">
                {{ record.break_duration_minutes > 0 ? `${record.break_duration_minutes}m` : '-' }}
              </td>

              <!-- Total Líquido -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <span class="inline-block px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60">
                  +{{ formatMinutes(record.net_overtime_minutes) }}
                </span>
              </td>

              <!-- Categoria -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-lg bg-app-surface-elevated text-[11px] font-medium text-app-text-secondary border border-app-border">
                  {{ record.category || 'Geral' }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                  :class="getSyncBadgeClass(record.sync_status)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getSyncDotClass(record.sync_status)"></span>
                  {{ getSyncLabel(record.sync_status) }}
                </span>
              </td>

              <!-- Ações -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="$emit('edit', record)"
                    class="p-2 rounded-xl text-app-text-secondary hover:text-app-text-primary hover:bg-app-surface-elevated transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
                    title="Editar registro"
                    aria-label="Editar registro"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="$emit('delete', record.id)"
                    class="p-2 rounded-xl text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
                    title="Excluir registro"
                    aria-label="Excluir registro"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock, Pencil, Trash2 } from 'lucide-vue-next';
import RecordCard from './RecordCard.vue';
import type { LocalOvertimeRecord } from '../../services/db.js';

defineProps<{
  records: LocalOvertimeRecord[];
}>();

defineEmits<{
  (e: 'edit', record: LocalOvertimeRecord): void;
  (e: 'delete', id: string): void;
}>();

const checkOvernight = (record: LocalOvertimeRecord) => {
  const [sh, sm] = record.start_time.split(':').map(Number);
  const [eh, em] = record.end_time.split(':').map(Number);
  return (eh * 60 + em) < (sh * 60 + sm);
};

const getSyncLabel = (status?: string) => {
  switch (status) {
    case 'synced': return 'Sincronizado';
    case 'pending': return 'Pendente';
    case 'conflict': return 'Conflito';
    default: return 'Salvo';
  }
};

const getSyncBadgeClass = (status?: string) => {
  switch (status) {
    case 'synced': return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400';
    case 'pending': return 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-400';
    case 'conflict': return 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400';
    default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
  }
};

const getSyncDotClass = (status?: string) => {
  switch (status) {
    case 'synced': return 'bg-emerald-500';
    case 'pending': return 'bg-amber-500 animate-pulse';
    case 'conflict': return 'bg-red-500';
    default: return 'bg-slate-400';
  }
};

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
</script>
