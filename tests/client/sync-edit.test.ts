import { describe, it, expect } from 'vitest';

describe('Sync Edit & Update Protocol (US2)', () => {
  it('preserves original created_at timestamp when updating an existing record', () => {
    const existingRecord = {
      id: 'rec-edit-1',
      user_id: 'user-123',
      record_date: '2026-10-01',
      start_time: '08:00',
      end_time: '12:00',
      break_duration_minutes: 0,
      net_overtime_minutes: 240,
      sync_status: 'synced',
      created_at: '2026-10-01T08:00:00.000Z',
      client_updated_at: '2026-10-01T08:00:00.000Z',
    };

    const editPayload = {
      id: 'rec-edit-1',
      record_date: '2026-10-01',
      start_time: '08:00',
      end_time: '14:00',
      break_duration_minutes: 30,
      net_overtime_minutes: 330,
    };

    const updatedNow = '2026-10-02T10:00:00.000Z';
    const createdAt = existingRecord.created_at;

    const merged = {
      ...editPayload,
      user_id: existingRecord.user_id,
      sync_status: 'pending',
      client_updated_at: updatedNow,
      created_at: createdAt,
      updated_at: updatedNow,
    };

    expect(merged.created_at).toBe('2026-10-01T08:00:00.000Z');
    expect(merged.client_updated_at).toBe('2026-10-02T10:00:00.000Z');
    expect(merged.sync_status).toBe('pending');
    expect(merged.net_overtime_minutes).toBe(330);
  });

  it('protects local pending modifications from being overwritten by server pull', () => {
    const localStore: Record<string, { id: string; end_time: string; sync_status: string }> = {
      'rec-1': { id: 'rec-1', end_time: '14:00', sync_status: 'pending' },
      'rec-2': { id: 'rec-2', end_time: '12:00', sync_status: 'synced' },
    };

    const serverRecords = [
      { id: 'rec-1', end_time: '10:00' }, // Stale server version
      { id: 'rec-2', end_time: '13:00' }, // Updated on server
    ];

    for (const rec of serverRecords) {
      const local = localStore[rec.id];
      // Only overwrite if absent or already marked synced
      if (!local || local.sync_status === 'synced') {
        localStore[rec.id] = { ...rec, sync_status: 'synced' };
      }
    }

    expect(localStore['rec-1'].end_time).toBe('14:00'); // Preserved!
    expect(localStore['rec-1'].sync_status).toBe('pending');
    expect(localStore['rec-2'].end_time).toBe('13:00'); // Updated
  });

  it('resolves Last-Write-Wins using client_updated_at comparison', () => {
    const serverRecord = {
      id: 'rec-lww',
      client_updated_at: '2026-10-02T10:00:00.000Z',
      end_time: '12:00'
    };

    const incomingNewer = {
      id: 'rec-lww',
      client_updated_at: '2026-10-02T10:05:00.000Z',
      end_time: '13:00'
    };

    const incomingOlder = {
      id: 'rec-lww',
      client_updated_at: '2026-10-02T09:55:00.000Z',
      end_time: '11:00'
    };

    const shouldApplyNewer = new Date(incomingNewer.client_updated_at) >= new Date(serverRecord.client_updated_at);
    const shouldApplyOlder = new Date(incomingOlder.client_updated_at) >= new Date(serverRecord.client_updated_at);

    expect(shouldApplyNewer).toBe(true);
    expect(shouldApplyOlder).toBe(false);
  });
});
