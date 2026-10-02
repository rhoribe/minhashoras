import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { syncManager, isSyncing, lastSyncTime } from '../services/sync.js';

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const pendingCount = ref(0);

let isInitialized = false;

export function useNetworkStatus() {
  const refreshPendingCount = async (): Promise<number> => {
    try {
      const count = await syncManager.getPendingCount();
      pendingCount.value = count;
      return count;
    } catch {
      return 0;
    }
  };

  const syncNow = async (): Promise<void> => {
    if (!isOnline.value) return;
    await syncManager.triggerSync();
    await refreshPendingCount();
  };

  const handleOnline = () => {
    isOnline.value = true;
    syncNow().catch(console.error);
  };

  const handleOffline = () => {
    isOnline.value = false;
    refreshPendingCount().catch(console.error);
  };

  if (!isInitialized && typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshPendingCount().catch(console.error);
    isInitialized = true;
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncNow,
    refreshPendingCount,
  };
}
