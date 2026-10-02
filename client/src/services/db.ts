import Dexie, { type Table } from 'dexie';

export interface LocalOvertimeRecord {
  id: string;
  user_id: string;
  record_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  net_overtime_minutes: number;
  description?: string;
  category: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface LocalCompensationSchedule {
  id: string;
  user_id: string;
  planned_date: string;
  scheduled_minutes: number;
  actual_minutes?: number | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  client_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface LocalSyncQueueItem {
  id?: number;
  user_id?: string;
  entityType: 'overtime_record' | 'compensation_schedule' | 'settings';
  entityId: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  enqueuedAt: string;
}

export interface LocalUserPreferences {
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system';
  daily_standard_work_minutes?: number;
  max_positive_limit_minutes?: number;
  max_negative_limit_minutes?: number;
  warning_threshold_percentage?: number;
  updated_at?: string;
}

export interface LocalActiveSession {
  id: string;
  user_id: string;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    display_name: string;
  };
  cached_at: string;
}

export class MinhasHorasDB extends Dexie {
  overtimeRecords!: Table<LocalOvertimeRecord, string>;
  compensations!: Table<LocalCompensationSchedule, string>;
  syncQueue!: Table<LocalSyncQueueItem, number>;
  preferences!: Table<LocalUserPreferences, string>;
  activeSession!: Table<LocalActiveSession, string>;

  constructor() {
    super('minhashoras_db');
    this.version(1).stores({
      overtimeRecords: 'id, record_date, sync_status, client_updated_at',
      compensations: 'id, planned_date, status, sync_status',
      syncQueue: '++id, entityType, entityId, enqueuedAt'
    });

    this.version(2).stores({
      overtimeRecords: 'id, user_id, record_date, sync_status, client_updated_at',
      compensations: 'id, user_id, planned_date, status, sync_status',
      syncQueue: '++id, user_id, entityType, entityId, enqueuedAt',
      preferences: 'user_id, theme_mode',
      activeSession: 'id, user_id'
    });
  }
}

export const localDb = new MinhasHorasDB();

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    localDb.overtimeRecords.clear(),
    localDb.compensations.clear(),
    localDb.syncQueue.clear(),
    localDb.preferences.clear(),
    localDb.activeSession.clear(),
  ]);
}
