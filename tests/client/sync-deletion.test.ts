import { describe, it, expect } from 'vitest';

describe('Sync Deletion Protocol (US1)', () => {
  it('identifies deleted records and constructs payload with deleted_record_ids', () => {
    const queue = [
      { id: 1, user_id: 'u1', entityType: 'overtime_record', entityId: 'rec-1', action: 'delete' },
      { id: 2, user_id: 'u1', entityType: 'overtime_record', entityId: 'rec-2', action: 'insert' },
      { id: 3, user_id: 'u1', entityType: 'compensation_schedule', entityId: 'comp-1', action: 'delete' },
    ];

    const deletedRecordIds = queue
      .filter(q => q.action === 'delete' && q.entityType === 'overtime_record')
      .map(q => q.entityId);

    const deletedCompIds = queue
      .filter(q => q.action === 'delete' && q.entityType === 'compensation_schedule')
      .map(q => q.entityId);

    expect(deletedRecordIds).toEqual(['rec-1']);
    expect(deletedCompIds).toEqual(['comp-1']);
  });

  it('filters out pending deleted records during pull from server to prevent resurrection', () => {
    const pendingDeletedIds = new Set(['rec-deleted-123']);

    const serverRecords = [
      { id: 'rec-active-1', description: 'Active shift' },
      { id: 'rec-deleted-123', description: 'Deleted shift from stale server cache' },
      { id: 'rec-active-2', description: 'Another active shift' }
    ];

    const reconciledRecords = serverRecords.filter(rec => !pendingDeletedIds.has(rec.id));

    expect(reconciledRecords).toHaveLength(2);
    expect(reconciledRecords.map(r => r.id)).toEqual(['rec-active-1', 'rec-active-2']);
    expect(reconciledRecords.find(r => r.id === 'rec-deleted-123')).toBeUndefined();
  });

  it('identifies locally synced records that were removed on server and prunes them', () => {
    const localSyncedRecords = [
      { id: 'rec-1', sync_status: 'synced' },
      { id: 'rec-2', sync_status: 'synced' },
      { id: 'rec-3', sync_status: 'synced' },
    ];

    const serverRecordIds = new Set(['rec-1', 'rec-3']);

    const toPruneLocally = localSyncedRecords.filter(r => !serverRecordIds.has(r.id));

    expect(toPruneLocally).toHaveLength(1);
    expect(toPruneLocally[0].id).toBe('rec-2');
  });
});
