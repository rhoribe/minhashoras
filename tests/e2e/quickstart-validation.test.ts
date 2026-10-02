import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../../server/src/index.js';
import { runMigrations } from '../../server/src/db/migrate.js';
import { db } from '../../server/src/db/connection.js';

describe('Quickstart End-to-End Validation Suite', () => {
  const app = buildServer();
  const testUser = 'user_e2e_quickstart';

  beforeAll(() => {
    runMigrations();
    db.prepare("DELETE FROM overtime_records WHERE user_id = ? OR id LIKE 'e2e-%'").run(testUser);
    db.prepare("DELETE FROM compensation_schedules WHERE user_id = ? OR id LIKE 'e2e-%'").run(testUser);
    db.prepare('DELETE FROM time_bank_balance WHERE user_id = ?').run(testUser);
    db.prepare('DELETE FROM time_bank_settings WHERE user_id = ?').run(testUser);
  });

  it('Scenario 1: Regular Overtime Entry & Duration Calculation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      payload: {
        id: 'e2e-rec-001',
        user_id: testUser,
        record_date: '2026-10-01',
        start_time: '18:00',
        end_time: '20:30',
        break_duration_minutes: 0,
        description: 'Scenario 1 entry'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.net_overtime_minutes).toBe(150); // 2h 30m
  });

  it('Scenario 2: Overnight Shift Calculation Crossing Midnight', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/records',
      payload: {
        id: 'e2e-rec-002',
        user_id: testUser,
        record_date: '2026-10-02',
        start_time: '22:00',
        end_time: '02:30',
        break_duration_minutes: 30,
        description: 'Scenario 2 overnight'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    // 22:00 to 02:30 = 270m, minus 30m break = 240m (4h 00m)
    expect(body.net_overtime_minutes).toBe(240);
  });

  it('Scenario 3: Offline-First Batch Synchronization', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      payload: {
        records: [
          {
            id: 'e2e-rec-003',
            user_id: testUser,
            record_date: '2026-10-03',
            start_time: '19:00',
            end_time: '21:00',
            break_duration_minutes: 0,
            description: 'Offline queued record',
            client_updated_at: new Date().toISOString()
          }
        ],
        client_sync_timestamp: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.applied_record_ids).toContain('e2e-rec-003');
    // Balance total should include 150 + 240 + 120 = 510m
    expect(body.balance.total_positive_minutes).toBe(510);
  });

  it('Scenario 4: Limit Configuration & Warning Thresholds', async () => {
    // Set limit of 600m (10h) with 80% warning (480m)
    const setRes = await app.inject({
      method: 'PUT',
      url: '/api/v1/settings',
      payload: {
        max_positive_limit_minutes: 600,
        warning_threshold_percentage: 80
      }
    });
    expect(setRes.statusCode).toBe(200);

    const balRes = await app.inject({
      method: 'GET',
      url: '/api/v1/balance',
    });
    expect(balRes.statusCode).toBe(200);
  });

  it('Scenario 5: Pre-Scheduled Compensation & Projected Balance', async () => {
    const compRes = await app.inject({
      method: 'POST',
      url: '/api/v1/compensations',
      payload: {
        id: 'e2e-comp-001',
        user_id: testUser,
        planned_date: '2026-10-25',
        scheduled_minutes: 240,
        notes: 'Pre-scheduled day off'
      }
    });

    expect(compRes.statusCode).toBe(201);
    const comp = JSON.parse(compRes.payload);
    expect(comp.status).toBe('Scheduled');
    expect(comp.scheduled_minutes).toBe(240);
  });

  it('Scenario 6: Multi-Format Reports Export (CSV, XLSX, PDF)', async () => {
    // 1. CSV
    const csvRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=csv&start_date=2026-10-01&end_date=2026-10-31',
    });
    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');

    // 2. XLSX
    const xlsxRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=xlsx&start_date=2026-10-01&end_date=2026-10-31',
    });
    expect(xlsxRes.statusCode).toBe(200);
    expect(xlsxRes.headers['content-type']).toContain('spreadsheetml.sheet');

    // 3. PDF
    const pdfRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/export?format=pdf&start_date=2026-10-01&end_date=2026-10-31',
    });
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
  });
});
