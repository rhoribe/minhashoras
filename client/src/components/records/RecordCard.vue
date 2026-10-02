<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-colors duration-200">
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ formatDate(record.record_date) }}</span>
          <!-- Sync Badge -->
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1"
            :class="syncBadgeClass"
          >
            <span class="w-1.5 h-1.5 rounded-full" :class="syncDotClass"></span>
            {{ syncLabel }}
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {{ record.start_time }} → {{ record.end_time }}
          </span>
          <span v-if="isOvernight" class="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">(vira a noite)</span>
        </div>
      </div>

      <!-- Net duration badge -->
      <div class="text-right">
        <span class="text-base font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-xl inline-block">
          +{{ formatMinutes(record.net_overtime_minutes) }}
        </span>
        <div v-if="record.break_duration_minutes > 0" class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          Pausa: {{ record.break_duration_minutes }}m
        </div>
      </div>
    </div>

    <!-- Description / Note -->
    <p v-if="record.description" class="text-xs text-slate-700 dark:text-slate-300 mt-2.5 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
      {{ record.description }}
    </p>

    <!-- Card Actions -->
    <div class="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
      <button
        @click="$emit('edit', record)"
        class="p-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 min-h-touch"
      >
        <Pencil class="w-3.5 h-3.5" />
        <span>Editar</span>
      </button>
      <button
        @click="$emit('delete', record.id)"
        class="p-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1 min-h-touch"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>Excluir</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import type { LocalOvertimeRecord } from '../../services/db.js';

const props = defineProps<{
  record: LocalOvertimeRecord;
}>();

defineEmits<{
  (e: 'edit', record: LocalOvertimeRecord): void;
  (e: 'delete', id: string): void;
}>();

const isOvernight = computed(() => {
  const [sh, sm] = props.record.start_time.split(':').map(Number);
  const [eh, em] = props.record.end_time.split(':').map(Number);
  return (eh * 60 + em) < (sh * 60 + sm);
});

const syncLabel = computed(() => {
  switch (props.record.sync_status) {
    case 'synced': return 'Sincronizado';
    case 'pending': return 'Pendente';
    case 'conflict': return 'Conflito';
    default: return 'Salvo';
  }
});

const syncBadgeClass = computed(() => {
  switch (props.record.sync_status) {
    case 'synced': return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400';
    case 'pending': return 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-400';
    case 'conflict': return 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400';
    default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
  }
});

const syncDotClass = computed(() => {
  switch (props.record.sync_status) {
    case 'synced': return 'bg-emerald-500';
    case 'pending': return 'bg-amber-500 animate-pulse';
    case 'conflict': return 'bg-red-500';
    default: return 'bg-slate-400';
  }
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
</script>
