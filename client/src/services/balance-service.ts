import { localDb } from './db.js';
import { getCurrentUserId } from './auth.js';

export interface LocalBalanceSummary {
  totalPositiveMinutes: number;
  totalNegativeMinutes: number;
  netBalanceMinutes: number;
  projectedBalanceMinutes: number;
  isWarning: boolean;
  isExceeded: boolean;
  maxPositiveLimitMinutes: number;
  maxNegativeLimitMinutes: number;
  warningThresholdPercentage: number;
}

export async function calculateLocalBalance(): Promise<LocalBalanceSummary> {
  const userId = getCurrentUserId();
  const records = await localDb.overtimeRecords.where('user_id').equals(userId).toArray();
  const compensations = await localDb.compensations.where('user_id').equals(userId).toArray();

  const totalPositive = records.reduce((acc, curr) => acc + (curr.net_overtime_minutes || 0), 0);

  const totalNegative = compensations
    .filter(c => c.status === 'Completed')
    .reduce((acc, curr) => acc + (curr.actual_minutes || curr.scheduled_minutes || 0), 0);

  const pendingScheduled = compensations
    .filter(c => c.status === 'Scheduled')
    .reduce((acc, curr) => acc + (curr.scheduled_minutes || 0), 0);

  const netBalance = totalPositive - totalNegative;
  const projectedBalance = netBalance - pendingScheduled;

  // Defaults or stored settings from IndexedDB
  let maxPositiveLimit = 2400; // 40h default
  let maxNegativeLimit = -600; // -10h default
  let warningPercentage = 80;

  try {
    const userPref = await localDb.preferences.get(userId);
    if (userPref) {
      if (typeof userPref.max_positive_limit_minutes === 'number' && userPref.max_positive_limit_minutes > 0) {
        maxPositiveLimit = userPref.max_positive_limit_minutes;
      }
      if (typeof userPref.max_negative_limit_minutes === 'number' && userPref.max_negative_limit_minutes < 0) {
        maxNegativeLimit = userPref.max_negative_limit_minutes;
      }
      if (
        typeof userPref.warning_threshold_percentage === 'number' &&
        userPref.warning_threshold_percentage > 0 &&
        userPref.warning_threshold_percentage <= 100
      ) {
        warningPercentage = userPref.warning_threshold_percentage;
      }
    }
  } catch (err) {
    console.warn('Could not read user preferences from localDb:', err);
  }

  const warningThreshold = (maxPositiveLimit * warningPercentage) / 100;
  const isWarning = netBalance >= warningThreshold && netBalance < maxPositiveLimit;
  const isExceeded = netBalance >= maxPositiveLimit;

  return {
    totalPositiveMinutes: totalPositive,
    totalNegativeMinutes: totalNegative,
    netBalanceMinutes: netBalance,
    projectedBalanceMinutes: projectedBalance,
    isWarning,
    isExceeded,
    maxPositiveLimitMinutes: maxPositiveLimit,
    maxNegativeLimitMinutes: maxNegativeLimit,
    warningThresholdPercentage: warningPercentage,
  };
}
