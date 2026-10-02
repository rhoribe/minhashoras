import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../../src/db/migrate.js';
import { db } from '../../src/db/connection.js';
import { recalculateBalance, getUserSettings } from '../../src/services/balance-calculator.js';

describe('Balance Calculator Service (US2 Unit)', () => {
  const testUser = 'user_test_balance';

  beforeAll(() => {
    runMigrations();
    db.prepare('DELETE FROM overtime_records WHERE user_id = ?').run(testUser);
    db.prepare('DELETE FROM compensation_schedules WHERE user_id = ?').run(testUser);
    db.prepare('DELETE FROM time_bank_balance WHERE user_id = ?').run(testUser);
  });

  it('calculates balance with warning and limit exceeded thresholds', () => {
    // Setup custom settings for user: max positive = 600m (10h), 80% warning threshold = 480m (8h)
    db.prepare(`
      INSERT OR REPLACE INTO time_bank_settings (
        id, user_id, max_positive_limit_minutes, max_negative_limit_minutes,
        warning_threshold_percentage, daily_standard_work_minutes,
        notifications_enabled, daily_reminder_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('settings_' + testUser, testUser, 600, -300, 80, 480, 1, '18:00', new Date().toISOString());

    // 1. Initial state (0 minutes)
    let bal = recalculateBalance(testUser);
    expect(bal.net_balance_minutes).toBe(0);
    expect(bal.is_warning_threshold_reached).toBe(false);
    expect(bal.is_limit_exceeded).toBe(false);

    // 2. Add 5 hours (300 min) - Normal zone
    db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time,
        break_duration_minutes, net_overtime_minutes, description,
        category, sync_status, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('rec_bal_1', testUser, '2026-10-01', '18:00', '23:00', 0, 300, 'Shift 1', 'standard', 'synced', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    bal = recalculateBalance(testUser);
    expect(bal.net_balance_minutes).toBe(300);
    expect(bal.is_warning_threshold_reached).toBe(false);
    expect(bal.is_limit_exceeded).toBe(false);

    // 3. Add 3.5 hours (210 min) - Total = 510 min (> 480 min warning threshold)
    db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time,
        break_duration_minutes, net_overtime_minutes, description,
        category, sync_status, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('rec_bal_2', testUser, '2026-10-02', '18:00', '21:30', 0, 210, 'Shift 2', 'standard', 'synced', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    bal = recalculateBalance(testUser);
    expect(bal.net_balance_minutes).toBe(510);
    expect(bal.is_warning_threshold_reached).toBe(true);
    expect(bal.is_limit_exceeded).toBe(false);

    // 4. Add 2 hours (120 min) - Total = 630 min (> 600 min max limit exceeded)
    db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time,
        break_duration_minutes, net_overtime_minutes, description,
        category, sync_status, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('rec_bal_3', testUser, '2026-10-03', '18:00', '20:00', 0, 120, 'Shift 3', 'standard', 'synced', new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

    bal = recalculateBalance(testUser);
    expect(bal.net_balance_minutes).toBe(630);
    expect(bal.is_limit_exceeded).toBe(true);
  });
});
