import { db } from '../db/connection.js';

export interface CompensationEntity {
  id: string;
  user_id: string;
  planned_date: string;
  scheduled_minutes: number;
  actual_minutes: number | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes: string | null;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompensationInput {
  id: string;
  user_id?: string;
  planned_date: string;
  scheduled_minutes: number;
  actual_minutes?: number | null;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string | null;
  client_updated_at?: string;
}

export class CompensationsRepository {
  findAll(userId: string = 'default_user'): CompensationEntity[] {
    return db.prepare('SELECT * FROM compensation_schedules WHERE user_id = ? ORDER BY planned_date ASC').all(userId) as CompensationEntity[];
  }

  findById(id: string): CompensationEntity | undefined {
    return db.prepare('SELECT * FROM compensation_schedules WHERE id = ?').get(id) as CompensationEntity | undefined;
  }

  create(input: CreateCompensationInput): CompensationEntity {
    const userId = input.user_id || 'default_user';
    const now = new Date().toISOString();
    const clientUpdatedAt = input.client_updated_at || now;

    if (!input.scheduled_minutes || input.scheduled_minutes <= 0) {
      throw new Error('Scheduled minutes must be greater than 0.');
    }

    db.prepare(`
      INSERT INTO compensation_schedules (
        id, user_id, planned_date, scheduled_minutes, actual_minutes,
        status, notes, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      userId,
      input.planned_date,
      input.scheduled_minutes,
      input.actual_minutes || null,
      input.status || 'Scheduled',
      input.notes || null,
      clientUpdatedAt,
      now,
      now
    );

    return this.findById(input.id)!;
  }

  update(id: string, input: Partial<CreateCompensationInput>): CompensationEntity | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE compensation_schedules SET
        planned_date = ?,
        scheduled_minutes = ?,
        actual_minutes = ?,
        status = ?,
        notes = ?,
        client_updated_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      input.planned_date || existing.planned_date,
      input.scheduled_minutes !== undefined ? input.scheduled_minutes : existing.scheduled_minutes,
      input.actual_minutes !== undefined ? input.actual_minutes : existing.actual_minutes,
      input.status || existing.status,
      input.notes !== undefined ? input.notes : existing.notes,
      input.client_updated_at || now,
      now,
      id
    );

    return this.findById(id);
  }

  delete(id: string, userId?: string): boolean {
    let sql = 'DELETE FROM compensation_schedules WHERE id = ?';
    const params: any[] = [id];
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    const res = db.prepare(sql).run(...params);
    return res.changes > 0;
  }
}

export const compensationsRepository = new CompensationsRepository();
