<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform -translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-2 opacity-0"
  >
    <div
      v-if="!isOnline && !dismissed"
      class="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 shadow-sm flex items-start sm:items-center justify-between gap-3 text-xs"
      role="status"
    >
      <div class="flex items-center space-x-2.5 min-w-0">
        <div class="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
          <WifiOff class="w-4 h-4" />
        </div>
        <div class="truncate">
          <p class="font-bold leading-tight">Você está trabalhando offline</p>
          <p class="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
            Novos turnos, alterações e exclusões são salvos localmente e sincronizados assim que a conexão voltar.
            <span v-if="pendingCount > 0" class="font-semibold underline ml-1">
              ({{ pendingCount }} {{ pendingCount === 1 ? 'item pendente' : 'itens pendentes' }})
            </span>
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          @click="handleRetry"
          :disabled="isSyncing"
          class="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition shadow-sm disabled:opacity-50 min-h-touch cursor-pointer"
        >
          {{ isSyncing ? 'Sincronizando...' : 'Verificar conexão' }}
        </button>
        <button
          type="button"
          @click="dismissed = true"
          class="p-1 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition min-w-touch min-h-touch flex items-center justify-center cursor-pointer"
          aria-label="Dispensar aviso"
          title="Dispensar aviso"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { WifiOff, X } from 'lucide-vue-next';
import { useNetworkStatus } from '../../composables/useNetworkStatus.js';

const { isOnline, isSyncing, pendingCount, syncNow, refreshPendingCount } = useNetworkStatus();
const dismissed = ref(false);

watch(isOnline, (online) => {
  if (!online) {
    dismissed.value = false;
    refreshPendingCount();
  }
});

const handleRetry = async () => {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine;
  }
  await syncNow();
};
</script>
