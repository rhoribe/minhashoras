import { db } from '../db/connection.js';

export interface TimeBankSettingsEntity {
  id: string;
  user_id: string;
  max_positive_limit_minutes: number;
  max_negative_limit_minutes: number;
  warning_threshold_percentage: number;
  daily_standard_work_minutes: number;
  notifications_enabled: number;
  daily_reminder_time: string | null;
  updated_at: string;
}

export interface BalanceSummary {
  user_id: string;
  total_positive_minutes: number;
  total_negative_minutes: number;
  net_balance_minutes: number;
  projected_balance_minutes: number;
  is_warning_threshold_reached: boolean;
  is_limit_exceeded: boolean;
  settings: TimeBankSettingsEntity;
  last_calculated_at: string;
}

export function getUserSettings(userId: string = 'default_user'): TimeBankSettingsEntity {
  let settings = db.prepare('SELECT * FROM time_bank_settings WHERE user_id = ?').get(userId) as TimeBankSettingsEntity | undefined;
  if (!settings) {
    db.prepare(`
      INSERT INTO time_bank_settings (
        id, user_id, max_positive_limit_minutes, max_negative_limit_minutes,
        warning_threshold_percentage, daily_standard_work_minutes,
        notifications_enabled, daily_reminder_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('default_settings_' + userId, userId, 2400, -600, 80, 480, 1, '18:00', new Date().toISOString());

    settings = db.prepare('SELECT * FROM time_bank_settings WHERE user_id = ?').get(userId) as TimeBankSettingsEntity;
  }
  return settings;
}

export function recalculateBalance(userId: string = 'default_user'): BalanceSummary {
  // Sum positive overtime minutes
  const posRow = db.prepare(`
    SELECT COALESCE(SUM(net_overtime_minutes), 0) AS total_positive
    FROM overtime_records
    WHERE user_id = ?
  `).get(userId) as { total_positive: number };
  const totalPositive = posRow.total_positive;

  // Sum completed compensations
  const negRow = db.prepare(`
    SELECT COALESCE(SUM(COALESCE(actual_minutes, scheduled_minutes)), 0) AS total_negative
    FROM compensation_schedules
    WHERE user_id = ? AND status = 'Completed'
  `).get(userId) as { total_negative: number };
  const totalNegative = negRow.total_negative;

  // Sum scheduled pending compensations
  const schedRow = db.prepare(`
    SELECT COALESCE(SUM(scheduled_minutes), 0) AS pending_scheduled
    FROM compensation_schedules
    WHERE user_id = ? AND status = 'Scheduled'
  `).get(userId) as { pending_scheduled: number };
  const pendingScheduled = schedRow.pending_scheduled;

  const netBalance = totalPositive - totalNegative;
  const projectedBalance = netBalance - pendingScheduled;
  const now = new Date().toISOString();

  // Upsert into time_bank_balance
  db.prepare(`
    INSERT INTO time_bank_balance (
      user_id, total_positive_minutes, total_negative_minutes,
      net_balance_minutes, projected_balance_minutes, last_calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      total_positive_minutes = excluded.total_positive_minutes,
      total_negative_minutes = excluded.total_negative_minutes,
      net_balance_minutes = excluded.net_balance_minutes,
      projected_balance_minutes = excluded.projected_balance_minutes,
      last_calculated_at = excluded.last_calculated_at
  `).run(userId, totalPositive, totalNegative, netBalance, projectedBalance, now);

  const settings = getUserSettings(userId);
  const maxPositive = settings.max_positive_limit_minutes;
  const warningThreshold = (maxPositive * settings.warning_threshold_percentage) / 100;

  const isWarning = netBalance >= warningThreshold && netBalance < maxPositive;
  const isExceeded = netBalance >= maxPositive;

  return {
    user_id: userId,
    total_positive_minutes: totalPositive,
    total_negative_minutes: totalNegative,
    net_balance_minutes: netBalance,
    projected_balance_minutes: projectedBalance,
    is_warning_threshold_reached: isWarning,
    is_limit_exceeded: isExceeded,
    settings,
    last_calculated_at: now
  };
}
