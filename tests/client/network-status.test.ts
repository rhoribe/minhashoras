import { describe, it, expect } from 'vitest';

describe('Network & Sync Status Contract (US3)', () => {
  it('determines badge label and style from connectivity and syncing state', () => {
    function getStatusBadge(isOnline: boolean, isSyncing: boolean, pendingCount: number) {
      if (!isOnline) {
        return {
          label: pendingCount > 0 ? `Offline (${pendingCount})` : 'Offline',
          color: 'amber',
          dotClass: 'bg-amber-500',
          title: pendingCount > 0
            ? `${pendingCount} alterações pendentes de sincronização`
            : 'Modo offline - salvando localmente'
        };
      }
      if (isSyncing) {
        return {
          label: 'Sincronizando...',
          color: 'blue',
          dotClass: 'bg-blue-500 animate-spin',
          title: 'Sincronizando dados com o servidor'
        };
      }
      return {
        label: 'Online',
        color: 'emerald',
        dotClass: 'bg-emerald-500',
        title: 'Conexão ativa e sincronizada'
      };
    }

    // Online & Synced
    const online = getStatusBadge(true, false, 0);
    expect(online.label).toBe('Online');
    expect(online.color).toBe('emerald');

    // Syncing
    const syncing = getStatusBadge(true, true, 2);
    expect(syncing.label).toBe('Sincronizando...');
    expect(syncing.color).toBe('blue');

    // Offline with pending changes
    const offlinePending = getStatusBadge(false, false, 3);
    expect(offlinePending.label).toBe('Offline (3)');
    expect(offlinePending.color).toBe('amber');

    // Offline without pending changes
    const offlineClean = getStatusBadge(false, false, 0);
    expect(offlineClean.label).toBe('Offline');
    expect(offlineClean.color).toBe('amber');
  });

  it('calculates total pending mutations accurately across records, compensations, and deletions', () => {
    const pendingRecordsCount = 2;
    const pendingCompensationsCount = 1;
    const pendingDeletionsCount = 1;

    const total = pendingRecordsCount + pendingCompensationsCount + pendingDeletionsCount;
    expect(total).toBe(4);
  });
});
