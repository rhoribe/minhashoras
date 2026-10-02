import { backupRepository, BackupRepository } from '../repositories/backup-repository.js';
import { backupService, BackupService } from './backup-service.js';
import { BackupFrequency, BackupSchedule } from '../types/backup.js';

export function calculateNextRun(
  schedule: {
    frequency: BackupFrequency;
    timeOfDay: string;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
  },
  fromDate: Date = new Date()
): Date {
  const parts = schedule.timeOfDay.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (schedule.frequency === 'daily') {
    const candidate = new Date(fromDate.getTime());
    candidate.setHours(hours, minutes, 0, 0);

    if (candidate.getTime() <= fromDate.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (schedule.frequency === 'weekly') {
    const targetDay = schedule.dayOfWeek !== undefined && schedule.dayOfWeek !== null ? schedule.dayOfWeek : 0;
    const candidate = new Date(fromDate.getTime());
    candidate.setHours(hours, minutes, 0, 0);

    const currentDay = candidate.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;

    if (daysToAdd === 0 && candidate.getTime() <= fromDate.getTime()) {
      daysToAdd = 7;
    }

    candidate.setDate(candidate.getDate() + daysToAdd);
    return candidate;
  }

  if (schedule.frequency === 'monthly') {
    const targetDay = schedule.dayOfMonth !== undefined && schedule.dayOfMonth !== null ? schedule.dayOfMonth : 1;
    let year = fromDate.getFullYear();
    let month = fromDate.getMonth();

    const maxDays = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, maxDays);
    const candidate = new Date(year, month, day, hours, minutes, 0, 0);

    if (candidate.getTime() <= fromDate.getTime()) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      const nextMaxDays = new Date(year, month + 1, 0).getDate();
      const nextDay = Math.min(targetDay, nextMaxDays);
      return new Date(year, month, nextDay, hours, minutes, 0, 0);
    }

    return candidate;
  }

  // Fallback daily
  const fallback = new Date(fromDate.getTime());
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback;
}

export class BackupScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isTickRunning: boolean = false;
  private repository: BackupRepository;
  private service: BackupService;
  private checkIntervalMs: number;

  constructor(
    repository: BackupRepository = backupRepository,
    service: BackupService = backupService,
    checkIntervalMs: number = 60000
  ) {
    this.repository = repository;
    this.service = service;
    this.checkIntervalMs = checkIntervalMs;
  }

  start(): void {
    if (this.intervalTimer) {
      return;
    }

    // Clean up any stale in_progress/pending runs from previous unexpected process shutdown
    try {
      this.repository.cleanupOrphanRuns();
    } catch (err) {
      console.error('Failed to cleanup orphan backup runs:', err);
    }

    // Ensure initial next_run_at is computed if schedule is enabled
    try {
      const schedule = this.repository.getSchedule('default');
      if (schedule && schedule.enabled && !schedule.nextRunAt) {
        const nextRun = calculateNextRun(schedule, new Date());
        this.repository.updateSchedule('default', {
          nextRunAt: nextRun.toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to initialize scheduler schedule:', err);
    }

    this.intervalTimer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('Error during scheduled backup tick:', err);
      });
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.isTickRunning) {
      return;
    }

    this.isTickRunning = true;
    try {
      const schedule = this.repository.getSchedule('default');
      if (!schedule || !schedule.enabled || !schedule.nextRunAt) {
        return;
      }

      const now = new Date();
      const nextRunDate = new Date(schedule.nextRunAt);

      if (now.getTime() >= nextRunDate.getTime()) {
        const lastRunAt = now.toISOString();
        const nextRunAt = calculateNextRun(schedule, now).toISOString();

        this.repository.updateScheduleRunTimestamps('default', lastRunAt, nextRunAt);

        await this.service.executeBackup('automated', schedule.id);
      }
    } catch (err) {
      console.error('Scheduled backup execution failed:', err);
    } finally {
      this.isTickRunning = false;
    }
  }
}

export const backupScheduler = new BackupScheduler();
