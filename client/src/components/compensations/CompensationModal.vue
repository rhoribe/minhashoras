<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 class="text-lg font-bold text-white flex items-center gap-2">
          <CalendarCheck2 class="w-5 h-5 text-amber-400" />
          Pré-Agendar Compensação
        </h2>
        <button @click="$emit('close')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Date -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Data Planejada</label>
          <input
            v-model="form.planned_date"
            type="date"
            required
            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <!-- Duration in Hours and Presets -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Horas a Compensar</label>
            <span class="text-xs font-bold text-amber-400">{{ form.hours }}h {{ form.minutes }}m ({{ totalMinutes }} min)</span>
          </div>

          <div class="grid grid-cols-2 gap-2 mb-2">
            <div>
              <span class="text-[11px] text-slate-400 block mb-0.5">Horas</span>
              <input
                v-model.number="form.hours"
                type="number"
                min="0"
                max="24"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <span class="text-[11px] text-slate-400 block mb-0.5">Minutos</span>
              <input
                v-model.number="form.minutes"
                type="number"
                min="0"
                max="59"
                step="5"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <!-- Presets -->
          <div class="flex gap-2">
            <button
              v-for="p in presets"
              :key="p.label"
              type="button"
              @click="setPreset(p.h, p.m)"
              class="flex-1 py-1.5 rounded-lg text-xs font-medium border border-slate-750 bg-slate-800/80 hover:bg-slate-750 text-slate-300 transition"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Motivo / Acordo</label>
          <input
            v-model="form.notes"
            type="text"
            placeholder="Ex: Folga da sexta, saída 2h mais cedo..."
            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <!-- Projected Impact Preview -->
        <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-750 flex items-center justify-between text-xs">
          <div>
            <span class="text-slate-400 block">Abatimento Planejado:</span>
            <span class="font-bold text-amber-400">-{{ form.hours }}h {{ form.minutes.toString().padStart(2, '0') }}m</span>
          </div>
          <div class="text-right">
            <span class="text-slate-400 block">Status Inicial:</span>
            <span class="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold text-[10px]">
              Agendada
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="totalMinutes <= 0"
            class="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-amber-950/50 transition"
          >
            Confirmar Agendamento
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue';
import { CalendarCheck2, X } from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: any): void;
}>();

const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const form = reactive({
  planned_date: getTomorrow(),
  hours: 4,
  minutes: 0,
  notes: '',
});

const presets = [
  { label: '2 horas', h: 2, m: 0 },
  { label: '4 horas (meio período)', h: 4, m: 0 },
  { label: '8 horas (dia todo)', h: 8, m: 0 },
];

const setPreset = (h: number, m: number) => {
  form.hours = h;
  form.minutes = m;
};

const totalMinutes = computed(() => (form.hours || 0) * 60 + (form.minutes || 0));

const handleSubmit = () => {
  if (totalMinutes.value <= 0) return;
  emit('save', {
    planned_date: form.planned_date,
    scheduled_minutes: totalMinutes.value,
    notes: form.notes || null,
    status: 'Scheduled',
  });
};
</script>
