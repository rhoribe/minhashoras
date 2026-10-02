import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../src/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('Sync API Contract (US1)', () => {
  const app = buildServer();

  beforeAll(() => {
    runMigrations();
  });

  it('POST /api/v1/sync applies offline batch records and recalculates balance', async () => {
    const syncId = '22222222-2222-4222-8222-222222222222';
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        records: [
          {
            id: syncId,
            record_date: '2026-10-02',
            start_time: '19:00',
            end_time: '21:00',
            break_duration_minutes: 0,
            description: 'Offline synced shift',
            category: 'standard',
            client_updated_at: new Date().toISOString()
          }
        ],
        client_sync_timestamp: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.applied_record_ids).toContain(syncId);
    expect(body.balance).toBeDefined();
    expect(body.balance.total_positive_minutes).toBeGreaterThanOrEqual(120);
    expect(body.server_timestamp).toBeDefined();
  });

  it('POST /api/v1/sync updates an existing record successfully via LWW', async () => {
    const editId = '33333333-3333-4333-8333-333333333333';
    // Initial insert
    await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        records: [
          {
            id: editId,
            record_date: '2026-10-02',
            start_time: '08:00',
            end_time: '12:00',
            break_duration_minutes: 0,
            description: 'Original shift',
            category: 'standard',
            client_updated_at: '2026-10-02T08:00:00.000Z'
          }
        ]
      }
    });

    // Update with later client_updated_at
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        records: [
          {
            id: editId,
            record_date: '2026-10-02',
            start_time: '08:00',
            end_time: '14:00',
            break_duration_minutes: 30,
            description: 'Updated shift',
            category: 'standard',
            client_updated_at: '2026-10-02T08:30:00.000Z'
          }
        ]
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.applied_record_ids).toContain(editId);
    expect(body.conflicts).toHaveLength(0);

    // Verify record in GET /records
    const checkRes = await app.inject({
      method: 'GET',
      url: '/api/v1/records'
    });
    const records = JSON.parse(checkRes.payload);
    const updated = records.find((r: any) => r.id === editId);
    expect(updated).toBeDefined();
    expect(updated.end_time).toBe('14:00');
    expect(updated.net_overtime_minutes).toBe(330); // 6h - 30m = 330m
  });

  it('POST /api/v1/sync processes deleted_record_ids and removes them from database', async () => {
    const toDeleteId = '44444444-4444-4444-8444-444444444444';
    // First create the record
    await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        records: [
          {
            id: toDeleteId,
            record_date: '2026-10-02',
            start_time: '14:00',
            end_time: '16:00',
            break_duration_minutes: 0,
            description: 'Shift to delete',
            category: 'standard',
            client_updated_at: new Date().toISOString()
          }
        ]
      }
    });

    // Now delete it via sync
    const deleteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        deleted_record_ids: [toDeleteId]
      }
    });

    expect(deleteRes.statusCode).toBe(200);
    const body = JSON.parse(deleteRes.payload);
    expect(body.applied_deleted_record_ids).toContain(toDeleteId);

    // Confirm it is gone from GET /records
    const checkRes = await app.inject({
      method: 'GET',
      url: '/api/v1/records'
    });
    const records = JSON.parse(checkRes.payload);
    expect(records.find((r: any) => r.id === toDeleteId)).toBeUndefined();
  });
});
