<template>
  <div v-if="isExceeded" class="p-3.5 rounded-2xl bg-red-950/80 border border-red-700/80 flex items-start gap-3 shadow-md shadow-red-950/40">
    <AlertOctagon class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
    <div class="text-xs">
      <span class="font-bold text-red-200 block text-sm">Limite de Horas Excedido!</span>
      <p class="text-red-300 mt-0.5">
        Seu saldo acumulou {{ currentFormatted }} e ultrapassou o teto permitido de {{ maxFormatted }}. Agende compensações para regularizar.
      </p>
    </div>
  </div>

  <div v-else-if="isWarning" class="p-3.5 rounded-2xl bg-amber-950/80 border border-amber-750 flex items-start gap-3 shadow-md shadow-amber-950/40">
    <AlertTriangle class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
    <div class="text-xs">
      <span class="font-bold text-amber-200 block text-sm">Atenção: Próximo ao Limite!</span>
      <p class="text-amber-300 mt-0.5">
        Você atingiu {{ percentage }}% do limite máximo permitido ({{ currentFormatted }} de {{ maxFormatted }}).
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AlertTriangle, AlertOctagon } from 'lucide-vue-next';

const props = defineProps<{
  isWarning: boolean;
  isExceeded: boolean;
  currentMinutes: number;
  maxMinutes: number;
}>();

const formatHours = (mins: number) => {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const currentFormatted = computed(() => formatHours(props.currentMinutes));
const maxFormatted = computed(() => formatHours(props.maxMinutes));

const percentage = computed(() => {
  if (props.maxMinutes <= 0) return 0;
  return Math.min(100, Math.round((props.currentMinutes / props.maxMinutes) * 100));
});
</script>
