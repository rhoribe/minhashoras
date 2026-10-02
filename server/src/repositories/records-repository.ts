import { db } from '../db/connection.js';
import { calculateOvertimeMinutes } from '../services/time-calculator.js';

export interface OvertimeRecordEntity {
  id: string;
  user_id: string;
  record_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  net_overtime_minutes: number;
  description: string | null;
  category: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecordInput {
  id: string;
  user_id?: string;
  record_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  description?: string | null;
  category?: string;
  sync_status?: 'synced' | 'pending' | 'conflict';
  client_updated_at?: string;
}

export class RecordsRepository {
  findAll(userId: string = 'default_user', startDate?: string, endDate?: string): OvertimeRecordEntity[] {
    let sql = 'SELECT * FROM overtime_records WHERE user_id = ?';
    const params: any[] = [userId];

    if (startDate) {
      sql += ' AND record_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND record_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY record_date DESC, start_time DESC';
    return db.prepare(sql).all(...params) as OvertimeRecordEntity[];
  }

  findById(id: string): OvertimeRecordEntity | undefined {
    return db.prepare('SELECT * FROM overtime_records WHERE id = ?').get(id) as OvertimeRecordEntity | undefined;
  }

  create(input: CreateRecordInput): OvertimeRecordEntity {
    const userId = input.user_id || 'default_user';
    const breakMinutes = input.break_duration_minutes || 0;
    const netMinutes = calculateOvertimeMinutes(input.start_time, input.end_time, breakMinutes);
    const now = new Date().toISOString();
    const clientUpdatedAt = input.client_updated_at || now;

    const stmt = db.prepare(`
      INSERT INTO overtime_records (
        id, user_id, record_date, start_time, end_time,
        break_duration_minutes, net_overtime_minutes, description,
        category, sync_status, client_updated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.id,
      userId,
      input.record_date,
      input.start_time,
      input.end_time,
      breakMinutes,
      netMinutes,
      input.description || null,
      input.category || 'standard',
      input.sync_status || 'synced',
      clientUpdatedAt,
      now,
      now
    );

    return this.findById(input.id)!;
  }

  update(id: string, input: Partial<CreateRecordInput>): OvertimeRecordEntity | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    const startTime = input.start_time || existing.start_time;
    const endTime = input.end_time || existing.end_time;
    const breakMinutes = input.break_duration_minutes !== undefined ? input.break_duration_minutes : existing.break_duration_minutes;
    const netMinutes = calculateOvertimeMinutes(startTime, endTime, breakMinutes);
    const now = new Date().toISOString();

    const userId = input.user_id || existing.user_id;
    const stmt = db.prepare(`
      UPDATE overtime_records SET
        user_id = ?,
        record_date = ?,
        start_time = ?,
        end_time = ?,
        break_duration_minutes = ?,
        net_overtime_minutes = ?,
        description = ?,
        category = ?,
        client_updated_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      userId,
      input.record_date || existing.record_date,
      startTime,
      endTime,
      breakMinutes,
      netMinutes,
      input.description !== undefined ? input.description : existing.description,
      input.category || existing.category,
      input.client_updated_at || now,
      now,
      id
    );

    return this.findById(id);
  }

  delete(id: string, userId?: string): boolean {
    let sql = 'DELETE FROM overtime_records WHERE id = ?';
    const params: any[] = [id];
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    const result = db.prepare(sql).run(...params);
    return result.changes > 0;
  }

  deleteAllForUser(userId: string): number {
    const result = db.prepare('DELETE FROM overtime_records WHERE user_id = ?').run(userId);
    return result.changes;
  }

  upsert(input: CreateRecordInput): { record: OvertimeRecordEntity; conflict: boolean } {
    const existing = this.findById(input.id);
    if (!existing) {
      return { record: this.create(input), conflict: false };
    }

    const incomingUpdatedAt = input.client_updated_at || new Date().toISOString();
    const existingClientUpdatedAt = existing.client_updated_at || existing.updated_at;
    // Deterministic timestamp comparison (last-write-wins based on client timestamp)
    if (new Date(incomingUpdatedAt) >= new Date(existingClientUpdatedAt)) {
      const updated = this.update(input.id, input)!;
      return { record: updated, conflict: false };
    }

    // Existing server record is newer
    return { record: existing, conflict: true };
  }
}

export const recordsRepository = new RecordsRepository();
