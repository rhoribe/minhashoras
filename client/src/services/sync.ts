import { ref, readonly } from 'vue';
import { localDb, clearAllLocalData, type LocalOvertimeRecord, type LocalCompensationSchedule } from './db.js';
import { getCurrentUserId, getAuthHeader } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

export const isSyncing = ref(false);
export const lastSyncTime = ref<Date | null>(null);

export class SyncManager {
  private _isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerSync().catch(console.error);
      });
    }
  }

  async saveRecordLocally(recordData: Omit<LocalOvertimeRecord, 'sync_status' | 'client_updated_at' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string }): Promise<LocalOvertimeRecord> {
    const id = recordData.id || uuidv4();
    const now = new Date().toISOString();
    const userId = recordData.user_id || getCurrentUserId();

    let createdAt = recordData.created_at || now;
    if (recordData.id) {
      const existing = await localDb.overtimeRecords.get(recordData.id);
      if (existing && existing.created_at) {
        createdAt = existing.created_at;
      }
    }

    const record: LocalOvertimeRecord = {
      ...recordData,
      id,
      user_id: userId,
      sync_status: 'pending',
      client_updated_at: now,
      created_at: createdAt,
      updated_at: now,
    };

    await localDb.overtimeRecords.put(record);
    await localDb.syncQueue.add({
      user_id: userId,
      entityType: 'overtime_record',
      entityId: id,
      action: recordData.id ? 'update' : 'insert',
      payload: record,
      enqueuedAt: now,
    });

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync().catch(console.error);
    }

    return record;
  }

  async deleteRecordLocally(id: string): Promise<void> {
    const userId = getCurrentUserId();
    await localDb.overtimeRecords.delete(id);
    await localDb.syncQueue.add({
      user_id: userId,
      entityType: 'overtime_record',
      entityId: id,
      action: 'delete',
      payload: { id },
      enqueuedAt: new Date().toISOString(),
    });

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync().catch(console.error);
    }
  }

  async deleteCompensationLocally(id: string): Promise<void> {
    const userId = getCurrentUserId();
    await localDb.compensations.delete(id);
    await localDb.syncQueue.add({
      user_id: userId,
      entityType: 'compensation_schedule',
      entityId: id,
      action: 'delete',
      payload: { id },
      enqueuedAt: new Date().toISOString(),
    });

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync().catch(console.error);
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const userId = getCurrentUserId();
      const recCount = await localDb.overtimeRecords
        .where('user_id')
        .equals(userId)
        .and(r => r.sync_status === 'pending')
        .count();
      const compCount = await localDb.compensations
        .where('user_id')
        .equals(userId)
        .and(c => c.sync_status === 'pending')
        .count();
      const delCount = await localDb.syncQueue
        .where('user_id')
        .equals(userId)
        .and(q => q.action === 'delete')
        .count();
      return recCount + compCount + delCount;
    } catch {
      return 0;
    }
  }

  async triggerSync(): Promise<void> {
    if (this._isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    this._isSyncing = true;
    isSyncing.value = true;
    try {
      const userId = getCurrentUserId();
      // Fetch all pending records from localDb scoped to current user
      const pendingRecords = await localDb.overtimeRecords
        .where('user_id')
        .equals(userId)
        .and(r => r.sync_status === 'pending')
        .toArray();

      const pendingCompensations = await localDb.compensations
        .where('user_id')
        .equals(userId)
        .and(c => c.sync_status === 'pending')
        .toArray();

      // Fetch pending deletions from syncQueue
      const pendingDeletions = await localDb.syncQueue
        .where('user_id')
        .equals(userId)
        .and(q => q.action === 'delete')
        .toArray();

      const deletedRecordIds = pendingDeletions
        .filter(q => q.entityType === 'overtime_record')
        .map(q => q.entityId);

      const deletedCompensationIds = pendingDeletions
        .filter(q => q.entityType === 'compensation_schedule')
        .map(q => q.entityId);

      if (
        pendingRecords.length === 0 &&
        pendingCompensations.length === 0 &&
        deletedRecordIds.length === 0 &&
        deletedCompensationIds.length === 0
      ) {
        // Pull latest from server
        await this.pullFromServer();
        lastSyncTime.value = new Date();
        return;
      }

      const response = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          records: pendingRecords,
          compensations: pendingCompensations,
          deleted_record_ids: deletedRecordIds,
          deleted_compensation_ids: deletedCompensationIds,
          client_sync_timestamp: new Date().toISOString(),
        }),
      });

      if (response.status === 401) {
        await clearAllLocalData();
        localStorage.removeItem('minhas_horas_auth_token');
        throw new Error('Sessão expirada ou revogada pelo sistema.');
      }

      if (!response.ok) throw new Error(`Sync failed with HTTP ${response.status}`);

      const result = await response.json();

      // Check system epoch for reset detection
      if (result.system_epoch) {
        const cachedEpoch = localStorage.getItem('minhas_horas_epoch');
        if (cachedEpoch && cachedEpoch !== result.system_epoch) {
          console.warn('System epoch mismatch detected (server reset). Purging local cache.');
          await clearAllLocalData();
          localStorage.setItem('minhas_horas_epoch', result.system_epoch);
          return;
        }
        localStorage.setItem('minhas_horas_epoch', result.system_epoch);
      }

      // Update synced records locally
      if (result.applied_record_ids && Array.isArray(result.applied_record_ids)) {
        for (const id of result.applied_record_ids) {
          await localDb.overtimeRecords.update(id, { sync_status: 'synced' });
        }
      }

      if (result.applied_compensation_ids && Array.isArray(result.applied_compensation_ids)) {
        for (const id of result.applied_compensation_ids) {
          await localDb.compensations.update(id, { sync_status: 'synced' });
        }
      }

      // Clean confirmed items from syncQueue
      const confirmedDeletedRecords = new Set(result.applied_deleted_record_ids || []);
      const confirmedDeletedComps = new Set(result.applied_deleted_compensation_ids || []);
      const confirmedRecords = new Set(result.applied_record_ids || []);
      const confirmedComps = new Set(result.applied_compensation_ids || []);

      const allQueueItems = await localDb.syncQueue.where('user_id').equals(userId).toArray();
      for (const item of allQueueItems) {
        if (item.action === 'delete') {
          if (
            (item.entityType === 'overtime_record' && confirmedDeletedRecords.has(item.entityId)) ||
            (item.entityType === 'compensation_schedule' && confirmedDeletedComps.has(item.entityId))
          ) {
            if (item.id !== undefined) {
              await localDb.syncQueue.delete(item.id);
            }
          }
        } else {
          if (
            (item.entityType === 'overtime_record' && confirmedRecords.has(item.entityId)) ||
            (item.entityType === 'compensation_schedule' && confirmedComps.has(item.entityId))
          ) {
            if (item.id !== undefined) {
              await localDb.syncQueue.delete(item.id);
            }
          }
        }
      }

      // Pull any new server changes
      await this.pullFromServer();
      lastSyncTime.value = new Date();
    } catch (err) {
      console.warn('Background sync encountered an error:', err);
    } finally {
      this._isSyncing = false;
      isSyncing.value = false;
    }
  }

  async pullFromServer(): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const userId = getCurrentUserId();
      const headers = getAuthHeader();

      // Retrieve IDs of items pending deletion so we never resurrect them
      const pendingDeletions = await localDb.syncQueue
        .where('user_id')
        .equals(userId)
        .and(q => q.action === 'delete')
        .toArray();
      const pendingDeletedIds = new Set(pendingDeletions.map(q => q.entityId));

      const recordsRes = await fetch('/api/v1/records', { headers });
      if (recordsRes.ok) {
        const records: LocalOvertimeRecord[] = await recordsRes.json();
        const serverRecordIds = new Set<string>();

        for (const rec of records) {
          serverRecordIds.add(rec.id);
          // Never resurrect items pending deletion
          if (pendingDeletedIds.has(rec.id)) {
            continue;
          }

          const local = await localDb.overtimeRecords.get(rec.id);
          // Only overwrite if absent or already marked synced (never overwrite local pending changes!)
          if (!local || local.sync_status === 'synced') {
            await localDb.overtimeRecords.put({
              ...rec,
              user_id: rec.user_id || userId,
              sync_status: 'synced',
            });
          }
        }

        // Clean up local synced records that no longer exist on server
        const localRecords = await localDb.overtimeRecords
          .where('user_id')
          .equals(userId)
          .and(r => r.sync_status === 'synced')
          .toArray();
        for (const localRec of localRecords) {
          if (!serverRecordIds.has(localRec.id)) {
            await localDb.overtimeRecords.delete(localRec.id);
          }
        }
      }

      const compsRes = await fetch('/api/v1/compensations', { headers });
      if (compsRes.ok) {
        const comps: LocalCompensationSchedule[] = await compsRes.json();
        const serverCompIds = new Set<string>();

        for (const comp of comps) {
          serverCompIds.add(comp.id);
          if (pendingDeletedIds.has(comp.id)) {
            continue;
          }

          const local = await localDb.compensations.get(comp.id);
          if (!local || local.sync_status === 'synced') {
            await localDb.compensations.put({
              ...comp,
              user_id: comp.user_id || userId,
              sync_status: 'synced',
            });
          }
        }

        // Clean up local synced compensations that no longer exist on server
        const localComps = await localDb.compensations
          .where('user_id')
          .equals(userId)
          .and(c => c.sync_status === 'synced')
          .toArray();
        for (const localComp of localComps) {
          if (!serverCompIds.has(localComp.id)) {
            await localDb.compensations.delete(localComp.id);
          }
        }
      }
    } catch (err) {
      console.warn('Error pulling updates from server:', err);
    }
  }
}

export const syncManager = new SyncManager();
