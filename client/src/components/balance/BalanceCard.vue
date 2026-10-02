<template>
  <div class="bg-app-surface border border-app-border rounded-3xl p-5 sm:p-6 lg:p-7 shadow-sm relative overflow-hidden transition-colors duration-200">
    <!-- Top label & Status -->
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-semibold text-app-text-muted uppercase tracking-wider">Saldo do Banco de Horas</span>
      <span
        class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
        :class="netMinutes >= 0 ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400' : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'"
      >
        {{ netMinutes >= 0 ? 'Positivo' : 'Negativo' }}
      </span>
    </div>

    <!-- Big Net Balance -->
    <div class="flex items-baseline gap-2 mb-4">
      <span
        class="text-4xl sm:text-5xl font-black tracking-tight"
        :class="netMinutes >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'"
      >
        {{ netFormatted }}
      </span>
      <span class="text-xs text-app-text-muted font-medium">líquido</span>
    </div>

    <!-- Projected Balance & Threshold Bar -->
    <div class="space-y-3 pt-3 border-t border-app-border">
      <div class="flex items-center justify-between text-xs">
        <span class="text-app-text-muted">Saldo Projetado pós-compensações:</span>
        <span class="font-bold text-app-primary">{{ projectedFormatted }}</span>
      </div>

      <!-- Capacity Progress Bar -->
      <div>
        <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
          <span>Uso do teto (+{{ Math.round(maxMinutes / 60) }}h)</span>
          <span :class="progressColorText">{{ usagePercentage }}%</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="progressBarColor"
            :style="{ width: `${usagePercentage}%` }"
          ></div>
        </div>
      </div>

      <!-- Breakdown: Positive vs Deductions -->
      <div class="grid grid-cols-2 gap-2 pt-2 text-xs">
        <div class="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Horas Extras Acumuladas</span>
          <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{{ positiveFormatted }}</span>
        </div>
        <div class="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 block">Compensações Realizadas</span>
          <span class="text-sm font-bold text-amber-600 dark:text-amber-400">-{{ negativeFormatted }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  positiveMinutes: number;
  negativeMinutes: number;
  netMinutes: number;
  projectedMinutes: number;
  maxMinutes: number;
}>();

const formatMinutes = (mins: number) => {
  const isNeg = mins < 0;
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isNeg ? '-' : '+';
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

const netFormatted = computed(() => {
  if (props.netMinutes === 0) return '0h 00m';
  return formatMinutes(props.netMinutes);
});

const projectedFormatted = computed(() => formatMinutes(props.projectedMinutes));
const positiveFormatted = computed(() => {
  const h = Math.floor(props.positiveMinutes / 60);
  const m = props.positiveMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
});
const negativeFormatted = computed(() => {
  const h = Math.floor(props.negativeMinutes / 60);
  const m = props.negativeMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
});

const usagePercentage = computed(() => {
  if (props.maxMinutes <= 0) return 0;
  const pct = Math.round((Math.max(0, props.netMinutes) / props.maxMinutes) * 100);
  return Math.min(100, Math.max(0, pct));
});

const progressBarColor = computed(() => {
  if (usagePercentage.value >= 100) return 'bg-red-500';
  if (usagePercentage.value >= 80) return 'bg-amber-400';
  return 'bg-emerald-500';
});

const progressColorText = computed(() => {
  if (usagePercentage.value >= 100) return 'text-red-600 dark:text-red-400 font-bold';
  if (usagePercentage.value >= 80) return 'text-amber-600 dark:text-amber-400 font-bold';
  return 'text-slate-600 dark:text-slate-300';
});
</script>
