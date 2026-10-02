import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const defaultDbPath = process.env.NODE_ENV === 'production' 
  ? (process.env.DB_PATH || '/data/minhashoras.db')
  : path.resolve(process.cwd(), 'data/minhashoras.db');

export function getDatabase(dbPath: string = defaultDbPath): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Constitution Principle IV & Hardware constraints: WAL mode and NORMAL sync for flash longevity
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export const db = getDatabase();
