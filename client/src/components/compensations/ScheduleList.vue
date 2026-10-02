<template>
  <div class="space-y-3">
    <div v-if="compensations.length === 0" class="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-850/40">
      <CalendarCheck2 class="w-10 h-10 text-slate-600 mx-auto mb-2" />
      <h3 class="text-sm font-semibold text-slate-300">Nenhuma compensação agendada</h3>
      <p class="text-xs text-slate-500 mt-1">Toque no botão abaixo para pré-agendar folgas ou saídas antecipadas.</p>
    </div>

    <div
      v-for="item in compensations"
      :key="item.id"
      class="bg-slate-800/90 border border-slate-750 rounded-2xl p-4 shadow-sm space-y-2.5 transition"
    >
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-semibold text-slate-400">{{ formatDate(item.planned_date) }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
              :class="statusBadgeClass(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
          </div>
          <span class="text-base font-bold text-white tracking-tight">
            {{ formatMinutes(item.actual_minutes || item.scheduled_minutes) }} a compensar
          </span>
        </div>

        <span class="text-sm font-extrabold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-xl">
          -{{ formatMinutes(item.actual_minutes || item.scheduled_minutes) }}
        </span>
      </div>

      <p v-if="item.notes" class="text-xs text-slate-300 bg-slate-850 p-2 rounded-lg border border-slate-800">
        {{ item.notes }}
      </p>

      <!-- Action buttons -->
      <div v-if="item.status === 'Scheduled'" class="flex items-center justify-end gap-2 pt-2 border-t border-slate-750/60">
        <button
          @click="$emit('cancel', item.id)"
          class="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700 transition"
        >
          Cancelar
        </button>
        <button
          @click="$emit('complete', item)"
          class="px-3 py-1 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition flex items-center gap-1"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Confirmar Realização</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarCheck2, Check } from 'lucide-vue-next';
import type { LocalCompensationSchedule } from '../../services/db.js';

defineProps<{
  compensations: LocalCompensationSchedule[];
}>();

defineEmits<{
  (e: 'complete', item: LocalCompensationSchedule): void;
  (e: 'cancel', id: string): void;
}>();

const formatDate = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'Scheduled': return 'Agendada';
    case 'Completed': return 'Concluída';
    case 'Cancelled': return 'Cancelada';
    default: return status;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Scheduled': return 'bg-amber-950/80 border-amber-800 text-amber-400';
    case 'Completed': return 'bg-emerald-950/80 border-emerald-800 text-emerald-400';
    case 'Cancelled': return 'bg-slate-800 border-slate-700 text-slate-400 line-through';
    default: return 'bg-slate-800 border-slate-700 text-slate-300';
  }
};
</script>
