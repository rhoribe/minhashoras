<template>
  <button
    type="button"
    @click="handleClick"
    class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer min-h-touch select-none"
    :class="badgeClasses"
    :title="badgeTitle"
    :aria-label="badgeTitle"
  >
    <span class="relative flex h-2 w-2">
      <span
        v-if="isOnline && !isSyncing"
        class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        :class="dotPingClass"
      ></span>
      <span
        class="relative inline-flex rounded-full h-2 w-2"
        :class="dotClass"
      ></span>
    </span>
    <span>{{ badgeLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNetworkStatus } from '../../composables/useNetworkStatus.js';

const { isOnline, isSyncing, pendingCount, syncNow } = useNetworkStatus();

const badgeLabel = computed(() => {
  if (!isOnline.value) {
    return pendingCount.value > 0 ? `Offline (${pendingCount.value})` : 'Offline';
  }
  if (isSyncing.value) {
    return 'Sincronizando...';
  }
  return 'Online';
});

const badgeTitle = computed(() => {
  if (!isOnline.value) {
    return pendingCount.value > 0
      ? `${pendingCount.value} alteraç${pendingCount.value === 1 ? 'ão pendente' : 'ões pendentes'} de sincronização - salvando localmente`
      : 'Modo offline - salvando no dispositivo';
  }
  if (isSyncing.value) {
    return 'Sincronizando dados com o servidor...';
  }
  return 'Conectado e dados sincronizados';
});

const badgeClasses = computed(() => {
  if (!isOnline.value) {
    return 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60';
  }
  if (isSyncing.value) {
    return 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 animate-pulse';
  }
  return 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60';
});

const dotClass = computed(() => {
  if (!isOnline.value) return 'bg-amber-500';
  if (isSyncing.value) return 'bg-blue-500';
  return 'bg-emerald-500';
});

const dotPingClass = computed(() => {
  return 'bg-emerald-400';
});

const handleClick = async () => {
  if (isOnline.value && !isSyncing.value) {
    await syncNow();
  }
};
</script>
