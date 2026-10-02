<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
    @click.self="close"
  >
    <div class="w-full sm:max-w-lg bg-app-surface border border-app-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto sm:my-auto">
      <div class="flex items-center justify-between border-b border-app-border pb-3.5">
        <h2 class="text-base sm:text-lg font-bold text-app-text-primary flex items-center gap-2">
          <Clock class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          {{ editingRecord ? 'Editar Hora Extra' : 'Novo Registro de Hora Extra' }}
        </h2>
        <button
          @click="close"
          class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-surface-elevated transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
          aria-label="Fechar"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Date -->
        <div>
          <label class="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">Data</label>
          <input
            v-model="form.record_date"
            type="date"
            required
            class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 transition min-h-touch"
          />
        </div>

        <!-- Times: Entry & Exit -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">Entrada</label>
            <input
              v-model="form.start_time"
              type="time"
              required
              class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 transition min-h-touch"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">Saída</label>
            <input
              v-model="form.end_time"
              type="time"
              required
              class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 transition min-h-touch"
            />
          </div>
        </div>

        <!-- Break Duration -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-app-text-muted uppercase tracking-wider">Intervalo / Pausa</label>
            <span class="text-xs font-medium text-app-text-secondary">{{ form.break_duration_minutes }} min</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="b in [0, 15, 30, 60]"
              :key="b"
              type="button"
              @click="form.break_duration_minutes = b"
              class="py-2 px-2 rounded-xl text-xs font-medium border transition min-h-touch cursor-pointer"
              :class="form.break_duration_minutes === b ? 'bg-emerald-600 border-emerald-500 text-white font-semibold shadow-sm' : 'bg-app-surface-elevated border-app-border text-app-text-secondary hover:bg-app-surface-elevated/80'"
            >
              {{ b }}m
            </button>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">Motivo / Descrição</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Ex: Entrega de release, plantão, fechamento..."
            class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 transition min-h-touch"
          />
        </div>

        <!-- Duration Preview & Overnight Shift Banner -->
        <div v-if="computedDuration" class="p-3.5 rounded-2xl bg-app-surface-elevated/70 border border-app-border flex items-center justify-between">
          <div>
            <span class="text-xs text-app-text-muted block">Total Líquido de Hora Extra</span>
            <span class="text-base font-bold text-emerald-600 dark:text-emerald-400">{{ computedDuration.display }}</span>
          </div>
          <div v-if="computedDuration.isOvernight" class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5">
            <Moon class="w-3.5 h-3.5" />
            Vira a noite
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
          {{ errorMessage }}
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            @click="close"
            class="flex-1 py-3 px-4 rounded-xl border border-app-border text-app-text-secondary font-medium text-sm hover:bg-app-surface-elevated transition min-h-touch cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="!isValid"
            class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition min-h-touch cursor-pointer"
          >
            Salvar Registro
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { Clock, X, Moon } from 'lucide-vue-next';
import type { LocalOvertimeRecord } from '../../services/db.js';

const props = defineProps<{
  isOpen: boolean;
  editingRecord?: LocalOvertimeRecord | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', record: any): void;
}>();

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const errorMessage = ref('');

const getToday = () => new Date().toISOString().split('T')[0];

const form = reactive({
  record_date: getToday(),
  start_time: '18:00',
  end_time: '20:30',
  break_duration_minutes: 0,
  description: '',
  category: 'standard',
});

watch(
  () => props.editingRecord,
  (record) => {
    if (record) {
      form.record_date = record.record_date;
      form.start_time = record.start_time;
      form.end_time = record.end_time;
      form.break_duration_minutes = record.break_duration_minutes;
      form.description = record.description || '';
      form.category = record.category || 'standard';
    } else {
      form.record_date = getToday();
      form.start_time = '18:00';
      form.end_time = '20:30';
      form.break_duration_minutes = 0;
      form.description = '';
      form.category = 'standard';
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const computedDuration = computed(() => {
  if (!form.start_time || !form.end_time) return null;
  try {
    const [sh, sm] = form.start_time.split(':').map(Number);
    const [eh, em] = form.end_time.split(':').map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;

    if (startM === endM) return null;

    let raw = endM > startM ? endM - startM : (endM + 24 * 60) - startM;
    const net = raw - (form.break_duration_minutes || 0);

    if (net <= 0) return null;

    const hours = Math.floor(net / 60);
    const mins = net % 60;
    return {
      minutes: net,
      display: `${hours}h ${mins.toString().padStart(2, '0')}m`,
      isOvernight: endM < startM,
    };
  } catch {
    return null;
  }
});

const isValid = computed(() => {
  return computedDuration.value !== null && computedDuration.value.minutes > 0;
});

const close = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!isValid.value || !computedDuration.value) {
    errorMessage.value = 'Horário inválido. A duração líquida deve ser maior que zero.';
    return;
  }

  emit('save', {
    id: props.editingRecord?.id,
    record_date: form.record_date,
    start_time: form.start_time,
    end_time: form.end_time,
    break_duration_minutes: form.break_duration_minutes,
    net_overtime_minutes: computedDuration.value.minutes,
    description: form.description || null,
    category: form.category,
  });
};
</script>
