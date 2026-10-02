import Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO system_metadata (key, value, updated_at)
    VALUES ('system_epoch', lower(hex(randomblob(16))), datetime('now'));
  `);
}
