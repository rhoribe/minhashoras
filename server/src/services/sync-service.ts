import { db } from '../db/connection.js';
import { recordsRepository, OvertimeRecordEntity } from '../repositories/records-repository.js';
import { compensationsRepository } from '../repositories/compensations-repository.js';
import { recalculateBalance, BalanceSummary } from './balance-calculator.js';

export interface SyncBatchPayload {
  records?: any[];
  compensations?: any[];
  deleted_record_ids?: string[];
  deleted_compensation_ids?: string[];
  client_sync_timestamp?: string;
}

export interface SyncBatchResult {
  applied_record_ids: string[];
  applied_compensation_ids: string[];
  applied_deleted_record_ids: string[];
  applied_deleted_compensation_ids: string[];
  conflicts: Array<{ id: string; reason: string }>;
  balance: BalanceSummary;
  server_timestamp: string;
}

export function processBatchSync(payload: SyncBatchPayload, userId: string = 'default_user'): SyncBatchResult {
  const appliedRecordIds: string[] = [];
  const appliedCompIds: string[] = [];
  const appliedDeletedRecordIds: string[] = [];
  const appliedDeletedCompIds: string[] = [];
  const conflicts: Array<{ id: string; reason: string }> = [];

  const now = new Date().toISOString();

  db.transaction(() => {
    // Process deleted records
    if (payload.deleted_record_ids && Array.isArray(payload.deleted_record_ids)) {
      for (const id of payload.deleted_record_ids) {
        try {
          recordsRepository.delete(id, userId);
          appliedDeletedRecordIds.push(id);
        } catch (err: any) {
          conflicts.push({ id, reason: err.message });
        }
      }
    }

    // Process deleted compensations
    if (payload.deleted_compensation_ids && Array.isArray(payload.deleted_compensation_ids)) {
      for (const id of payload.deleted_compensation_ids) {
        try {
          compensationsRepository.delete(id, userId);
          appliedDeletedCompIds.push(id);
        } catch (err: any) {
          conflicts.push({ id, reason: err.message });
        }
      }
    }

    // Process records
    if (payload.records && Array.isArray(payload.records)) {
      for (const rec of payload.records) {
        try {
          const res = recordsRepository.upsert({
            ...rec,
            user_id: userId
          });
          if (!res.conflict) {
            appliedRecordIds.push(res.record.id);
          } else {
            conflicts.push({ id: res.record.id, reason: 'server_version_newer' });
          }
        } catch (err: any) {
          conflicts.push({ id: rec.id, reason: err.message });
        }
      }
    }

    // Process compensations
    if (payload.compensations && Array.isArray(payload.compensations)) {
      for (const comp of payload.compensations) {
        try {
          const existing = db.prepare('SELECT * FROM compensation_schedules WHERE id = ? AND user_id = ?').get(comp.id, userId) as any;
          if (!existing) {
            db.prepare(`
              INSERT INTO compensation_schedules (
                id, user_id, planned_date, scheduled_minutes, actual_minutes,
                status, notes, client_updated_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              comp.id,
              userId,
              comp.planned_date,
              comp.scheduled_minutes,
              comp.actual_minutes || null,
              comp.status || 'Scheduled',
              comp.notes || null,
              comp.client_updated_at || now,
              comp.created_at || now,
              now
            );
            appliedCompIds.push(comp.id);
          } else {
            const incomingUpdatedAt = comp.client_updated_at || now;
            const existingClientUpdatedAt = existing.client_updated_at || existing.updated_at;
            if (new Date(incomingUpdatedAt) >= new Date(existingClientUpdatedAt)) {
              db.prepare(`
                UPDATE compensation_schedules SET
                  planned_date = ?,
                  scheduled_minutes = ?,
                  actual_minutes = ?,
                  status = ?,
                  notes = ?,
                  client_updated_at = ?,
                  updated_at = ?
                WHERE id = ? AND user_id = ?
              `).run(
                comp.planned_date || existing.planned_date,
                comp.scheduled_minutes || existing.scheduled_minutes,
                comp.actual_minutes !== undefined ? comp.actual_minutes : existing.actual_minutes,
                comp.status || existing.status,
                comp.notes !== undefined ? comp.notes : existing.notes,
                incomingUpdatedAt,
                now,
                comp.id,
                userId
              );
              appliedCompIds.push(comp.id);
            } else {
              conflicts.push({ id: comp.id, reason: 'server_version_newer' });
            }
          }
        } catch (err: any) {
          conflicts.push({ id: comp.id, reason: err.message });
        }
      }
    }
  })();

  const balance = recalculateBalance(userId);

  return {
    applied_record_ids: appliedRecordIds,
    applied_compensation_ids: appliedCompIds,
    applied_deleted_record_ids: appliedDeletedRecordIds,
    applied_deleted_compensation_ids: appliedDeletedCompIds,
    conflicts,
    balance,
    server_timestamp: now
  };
}
