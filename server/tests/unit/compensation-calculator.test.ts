import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../../src/db/migrate.js';
import { db } from '../../src/db/connection.js';
import { recalculateBalance } from '../../src/services/balance-calculator.js';

describe('Compensation Projected Balance (US3 Unit)', () => {
  const testUser = 'user_test_comp';

  beforeAll(() => {
    runMigrations();
    db.prepare('DELETE FROM overtime_records WHERE user_id = ?').run(testUser);
    db.prepare('DELETE FROM compensation_schedules WHERE user_id = ?').run(testUser);
    db.prepare('DELETE FROM time_bank_balance WHERE user_id = ?').run(testUser);
  });

  it('calculates realized balance vs projected balance after pre-scheduled compensations', () => {
    // 1. Add overtime shift: +480 minutes (8h)
    db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time,
        break_duration_minutes, net_overtime_minutes, description,
        category, sync_status, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('rec_comp_1', testUser, '2026-10-01', '08:00', '16:00', 0, 480, 'Full overtime', 'standard', 'synced', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    let bal = recalculateBalance(testUser);
    expect(bal.net_balance_minutes).toBe(480);
    expect(bal.projected_balance_minutes).toBe(480);

    // 2. Pre-schedule compensation for next week: 240 minutes (4h) - status 'Scheduled'
    db.prepare(`
      INSERT INTO compensation_schedules (
        id, user_id, planned_date, scheduled_minutes, actual_minutes,
        status, notes, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('comp_sched_1', testUser, '2026-10-15', 240, null, 'Scheduled', 'Half day off', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    bal = recalculateBalance(testUser);
    // Realized balance is still 480 (not yet taken)
    expect(bal.net_balance_minutes).toBe(480);
    // Projected balance is 480 - 240 = 240 min
    expect(bal.projected_balance_minutes).toBe(240);

    // 3. Mark compensation as 'Completed' with actual_minutes = 240
    db.prepare(`
      UPDATE compensation_schedules SET
        status = 'Completed',
        actual_minutes = 240,
        updated_at = ?
      WHERE id = 'comp_sched_1'
    `).run(new Date().toISOString());

    bal = recalculateBalance(testUser);
    // Realized balance is now deducted: 480 - 240 = 240 min
    expect(bal.net_balance_minutes).toBe(240);
    expect(bal.total_negative_minutes).toBe(240);
    expect(bal.projected_balance_minutes).toBe(240);
  });
});
