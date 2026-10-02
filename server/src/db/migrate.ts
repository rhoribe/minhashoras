import { getDatabase } from './connection.js';
import { up as migration001 } from './migrations/001_initial_schema.js';
import { up as migration002 } from './migrations/002_auth_and_user_preferences.js';
import { up as migration003 } from './migrations/003_backup_system.js';
import { up as migration004 } from './migrations/004_admin_and_roles.js';
import { up as migration005 } from './migrations/005_system_metadata.js';
import { up as migration006 } from './migrations/006_admin_bootstrap_and_password_change.js';

export function runMigrations(customDb?: any): void {
  const database = customDb || getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = database.prepare('SELECT name FROM migrations').all() as { name: string }[];
  const appliedNames = new Set(applied.map(m => m.name));

  const migrations = [
    { name: '001_initial_schema', fn: migration001 },
    { name: '002_auth_and_user_preferences', fn: migration002 },
    { name: '003_backup_system', fn: migration003 },
    { name: '004_admin_and_roles', fn: migration004 },
    { name: '005_system_metadata', fn: migration005 },
    { name: '006_admin_bootstrap_and_password_change', fn: migration006 }
  ];

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      database.transaction(() => {
        migration.fn(database);
        database.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(
          migration.name,
          new Date().toISOString()
        );
      })();
    }
  }
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations();
  console.log('Migrations executed successfully.');
}
