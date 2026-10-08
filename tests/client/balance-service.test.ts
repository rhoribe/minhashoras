import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateLocalBalance, type LocalBalanceSummary } from '../../client/src/services/balance-service.js';
import { localDb } from '../../client/src/services/db.js';
import * as authModule from '../../client/src/services/auth.js';

describe('Balance Service Dynamic Ceiling & Limits (Feature 013)', () => {
  const testUserId = 'test-user-ceiling-013';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authModule, 'getCurrentUserId').mockReturnValue(testUserId);
  });

  it('uses default limits (2400m / 40h, -600m / -10h, 80%) when no preferences are cached', async () => {
    vi.spyOn(localDb.overtimeRecords, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => [
          { id: 'r1', user_id: testUserId, net_overtime_minutes: 600 }
        ]
      })
    } as any);

    vi.spyOn(localDb.compensations, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => []
      })
    } as any);

    vi.spyOn(localDb.preferences, 'get').mockResolvedValue(undefined);

    const summary: LocalBalanceSummary = await calculateLocalBalance();

    expect(summary.maxPositiveLimitMinutes).toBe(2400);
    expect(summary.maxNegativeLimitMinutes).toBe(-600);
    expect(summary.warningThresholdPercentage).toBe(80);
    expect(summary.netBalanceMinutes).toBe(600);
    expect(summary.isWarning).toBe(false);
    expect(summary.isExceeded).toBe(false);
  });

  it('resolves dynamic positive limit from localDb.preferences when configured (e.g. 1200m / 20h)', async () => {
    vi.spyOn(localDb.overtimeRecords, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => [
          { id: 'r1', user_id: testUserId, net_overtime_minutes: 600 }
        ]
      })
    } as any);

    vi.spyOn(localDb.compensations, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => []
      })
    } as any);

    vi.spyOn(localDb.preferences, 'get').mockResolvedValue({
      user_id: testUserId,
      theme_mode: 'system',
      max_positive_limit_minutes: 1200,
      max_negative_limit_minutes: -300,
      warning_threshold_percentage: 75,
    });

    const summary = await calculateLocalBalance();

    expect(summary.maxPositiveLimitMinutes).toBe(1200);
    expect(summary.maxNegativeLimitMinutes).toBe(-300);
    expect(summary.warningThresholdPercentage).toBe(75);
    expect(summary.netBalanceMinutes).toBe(600);
    // 600m is < 900m (75% of 1200m)
    expect(summary.isWarning).toBe(false);
    expect(summary.isExceeded).toBe(false);
  });

  it('triggers isWarning when net balance reaches configured custom warning threshold', async () => {
    // 960m on 1200m ceiling with 80% threshold (80% of 1200 = 960m)
    vi.spyOn(localDb.overtimeRecords, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => [
          { id: 'r1', user_id: testUserId, net_overtime_minutes: 960 }
        ]
      })
    } as any);

    vi.spyOn(localDb.compensations, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => []
      })
    } as any);

    vi.spyOn(localDb.preferences, 'get').mockResolvedValue({
      user_id: testUserId,
      theme_mode: 'system',
      max_positive_limit_minutes: 1200,
      max_negative_limit_minutes: -600,
      warning_threshold_percentage: 80,
    });

    const summary = await calculateLocalBalance();

    expect(summary.maxPositiveLimitMinutes).toBe(1200);
    expect(summary.isWarning).toBe(true);
    expect(summary.isExceeded).toBe(false);
  });

  it('triggers isExceeded when net balance equals or exceeds configured positive limit', async () => {
    // 1300m on 1200m ceiling
    vi.spyOn(localDb.overtimeRecords, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => [
          { id: 'r1', user_id: testUserId, net_overtime_minutes: 1300 }
        ]
      })
    } as any);

    vi.spyOn(localDb.compensations, 'where').mockReturnValue({
      equals: () => ({
        toArray: async () => []
      })
    } as any);

    vi.spyOn(localDb.preferences, 'get').mockResolvedValue({
      user_id: testUserId,
      theme_mode: 'system',
      max_positive_limit_minutes: 1200,
      max_negative_limit_minutes: -600,
      warning_threshold_percentage: 80,
    });

    const summary = await calculateLocalBalance();

    expect(summary.maxPositiveLimitMinutes).toBe(1200);
    expect(summary.isWarning).toBe(false);
    expect(summary.isExceeded).toBe(true);
  });
});
