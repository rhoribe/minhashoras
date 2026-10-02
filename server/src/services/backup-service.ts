import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createGzip, createGunzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { db as defaultDb } from '../db/connection.js';
import { BackupRepository, backupRepository as defaultBackupRepo } from '../repositories/backup-repository.js';
import {
  BackupRun,
  BackupStatus,
  BackupTriggerType,
  RestoreBackupResult,
  RestoreBackupOptions,
} from '../types/backup.js';


export class BackupService {
  private database: Database.Database;
  private repository: BackupRepository;
  private isExecuting: boolean = false;

  constructor(
    database: Database.Database = defaultDb,
    repository: BackupRepository = defaultBackupRepo
  ) {
    this.database = database;
    this.repository = repository;
  }

  getBackupDirectory(customDir?: string | null): string {
    if (customDir && customDir.trim().length > 0) {
      return path.resolve(customDir.trim());
    }

    if (process.env.BACKUP_DIR && process.env.BACKUP_DIR.trim().length > 0) {
      return path.resolve(process.env.BACKUP_DIR.trim());
    }

    if (process.env.NODE_ENV === 'production') {
      return '/backups';
    }

    return path.resolve(process.cwd(), 'data/backups');
  }

  isExternalAccessible(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.accessSync(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  getStatus(): BackupStatus {
    const backupDir = this.getBackupDirectory();
    const activeRun = this.repository.getActiveRun();
    const lastRun = this.repository.getLastCompletedRun();

    return {
      isRunning: this.isExecuting || activeRun !== null,
      currentRun: activeRun,
      lastRun: lastRun,
      backupDirectory: backupDir,
      isExternalAccessible: this.isExternalAccessible(backupDir),
    };
  }

  async executeBackup(
    triggerType: BackupTriggerType = 'manual',
    scheduleId: string | null = null,
    excludeFromPurgeId?: string
  ): Promise<BackupRun> {
    if (this.isExecuting || this.repository.getActiveRun() !== null) {
      const err = new Error('A backup process is already in progress');
      (err as any).statusCode = 409;
      (err as any).code = 'BACKUP_IN_PROGRESS';
      throw err;
    }

    this.isExecuting = true;

    const schedule = this.repository.getSchedule(scheduleId || 'default');
    const targetDir = this.getBackupDirectory(schedule?.targetDirectory);

    // Create run record
    const run = this.repository.createRun({
      scheduleId: scheduleId || (triggerType === 'automated' ? 'default' : null),
      triggerType,
      status: 'in_progress',
    });

    let tempSnapshotPath: string | null = null;
    let finalGzPath: string | null = null;

    try {
      // 1. Ensure target directory exists
      await fs.promises.mkdir(targetDir, { recursive: true });

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${run.id.substring(0, 8)}`;
      const fileName = `minhashoras-backup-${timestamp}.sqlite.gz`;
      tempSnapshotPath = path.join(targetDir, `temp-${run.id}.sqlite`);
      finalGzPath = path.join(targetDir, fileName);


      // 2. Perform SQLite online backup
      await this.database.backup(tempSnapshotPath);

      // 3. Verify SQLite integrity check on the snapshot
      const snapshotDb = new Database(tempSnapshotPath, { readonly: true });
      try {
        const integrity = snapshotDb.pragma('integrity_check') as { integrity_check: string }[];
        if (!integrity || integrity.length === 0 || integrity[0].integrity_check !== 'ok') {
          throw new Error(`Snapshot integrity check failed: ${JSON.stringify(integrity)}`);
        }
      } finally {
        snapshotDb.close();
      }

      // 4. Stream compress using gzip and calculate SHA-256 simultaneously
      const hash = createHash('sha256');
      const hashPassThrough = new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk);
          callback(null, chunk);
        },
      });

      await pipeline(
        fs.createReadStream(tempSnapshotPath),
        createGzip({ level: 9 }),
        hashPassThrough,
        fs.createWriteStream(finalGzPath)
      );

      const checksumSha256 = hash.digest('hex');
      const stat = await fs.promises.stat(finalGzPath);
      const recordsCount = this.repository.countTotalRecords();

      // Clean up temp uncompressed snapshot
      await fs.promises.unlink(tempSnapshotPath).catch(() => {});
      tempSnapshotPath = null;

      // 5. Update run record as completed
      const completedRun = this.repository.updateRun(run.id, {
        status: 'completed',
        fileName,
        filePath: finalGzPath,
        fileSizeBytes: stat.size,
        checksumSha256,
        recordsCount,
        completedAt: new Date().toISOString(),
      });

      // 6. Purge old backups according to retention policy
      const retentionCount = schedule?.retentionCount ?? 7;
      await this.purgeOldBackups(retentionCount, excludeFromPurgeId ? [excludeFromPurgeId] : []);

      return completedRun;
    } catch (err: any) {
      // Cleanup files on failure
      if (tempSnapshotPath) {
        await fs.promises.unlink(tempSnapshotPath).catch(() => {});
      }
      if (finalGzPath) {
        await fs.promises.unlink(finalGzPath).catch(() => {});
      }

      const errorMessage = err?.message || 'Unknown error occurred during backup';
      this.repository.updateRun(run.id, {
        status: 'failed',
        errorMessage,
        completedAt: new Date().toISOString(),
      });

      throw err;
    } finally {
      this.isExecuting = false;
    }
  }

  async purgeOldBackups(retentionCount: number, excludeIds: string[] = []): Promise<number> {
    const candidates = this.repository.findRetentionCandidates(retentionCount, excludeIds);
    let purgedCount = 0;


    for (const candidate of candidates) {
      if (candidate.filePath) {
        try {
          if (fs.existsSync(candidate.filePath)) {
            await fs.promises.unlink(candidate.filePath);
          }
        } catch (err) {
          console.warn(`Failed to delete physical file during purge: ${candidate.filePath}`, err);
        }
      }
      this.repository.markRunAsPurged(candidate.id);
      purgedCount++;
    }

    return purgedCount;
  }

  getBackupFile(id: string): { run: BackupRun; filePath: string } {
    const run = this.repository.getRunById(id);
    if (!run) {
      const err = new Error('Backup run not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (run.status === 'purged' || !run.filePath || !fs.existsSync(run.filePath)) {
      const err = new Error('Backup file not found or has been purged');
      (err as any).statusCode = 404;
      throw err;
    }

    return {
      run,
      filePath: run.filePath,
    };
  }

  async restoreBackup(
    id: string,
    options?: RestoreBackupOptions
  ): Promise<RestoreBackupResult> {
    if (this.isExecuting || this.repository.getActiveRun() !== null) {
      const err = new Error('A backup or restore process is already in progress');
      (err as any).statusCode = 409;
      (err as any).code = 'OPERATION_IN_PROGRESS';
      throw err;
    }

    const targetRun = this.repository.getRunById(id);
    if (!targetRun) {
      const err = new Error('Backup run not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (targetRun.status === 'purged' || !targetRun.filePath || !fs.existsSync(targetRun.filePath)) {
      const err = new Error('Backup file not found or has been purged');
      (err as any).statusCode = 404;
      throw err;
    }

    // Step 1: Automatic Pre-Restore Safety Snapshot (unless explicitly skipped)
    let preRestoreRun: BackupRun | null = null;
    if (!options?.skipPreRestore) {
      preRestoreRun = await this.executeBackup('manual', null, id);
    }

    const verifiedTargetRun = this.repository.getRunById(id);
    if (!verifiedTargetRun || verifiedTargetRun.status === 'purged' || !verifiedTargetRun.filePath || !fs.existsSync(verifiedTargetRun.filePath)) {
      const err = new Error('Backup file not found or has been purged');
      (err as any).statusCode = 404;
      throw err;
    }

    this.isExecuting = true;

    const targetDir = this.getBackupDirectory();
    const tempRestorePath = path.join(targetDir, `temp-restore-${id}-${Date.now()}.sqlite`);

    try {
      // Step 2: Validate archive checksum if recorded
      if (verifiedTargetRun.checksumSha256) {
        const fileHash = createHash('sha256');
        const fileStream = fs.createReadStream(verifiedTargetRun.filePath);
        for await (const chunk of fileStream) {
          fileHash.update(chunk);
        }
        const calculated = fileHash.digest('hex');
        if (calculated !== verifiedTargetRun.checksumSha256) {
          const err = new Error('Backup archive checksum mismatch: file may be corrupted');

          (err as any).statusCode = 422;
          throw err;
        }
      }

      // Step 3: Stream decompress archive into temporary sqlite file
      await pipeline(
        fs.createReadStream(verifiedTargetRun.filePath),
        createGunzip(),
        fs.createWriteStream(tempRestorePath)
      );

      // Step 4: Verify SQLite integrity of decompressed file
      const tempDb = new Database(tempRestorePath, { readonly: true });
      try {
        const integrity = tempDb.pragma('integrity_check') as { integrity_check: string }[];
        if (!integrity || integrity.length === 0 || integrity[0].integrity_check !== 'ok') {
          const err = new Error(`Restored database integrity check failed: ${JSON.stringify(integrity)}`);
          (err as any).statusCode = 422;
          throw err;
        }

        // Step 5: Restore data into active database using SQLite Online Backup API
        const activeDbPath = this.database.name;
        await tempDb.backup(activeDbPath);
      } finally {
        tempDb.close();
      }

      // Step 6: Post-restore database state harmonization
      try {
        this.database
          .prepare(`UPDATE backup_runs SET status = 'completed' WHERE id = ?`)
          .run(verifiedTargetRun.id);
      } catch {}

      // Clean up any other pending/in_progress orphan runs in the restored snapshot
      this.repository.cleanupOrphanRuns();

      // Persist the pre-restore safety run into the restored database
      if (preRestoreRun) {
        try {
          this.database
            .prepare(`
              INSERT OR REPLACE INTO backup_runs (
                id, schedule_id, trigger_type, status, file_name, file_path, file_size_bytes, checksum_sha256, records_count, error_message, started_at, completed_at, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              preRestoreRun.id,
              preRestoreRun.scheduleId,
              preRestoreRun.triggerType,
              preRestoreRun.status,
              preRestoreRun.fileName,
              preRestoreRun.filePath || null,
              preRestoreRun.fileSizeBytes,
              preRestoreRun.checksumSha256,
              preRestoreRun.recordsCount,
              preRestoreRun.errorMessage,
              preRestoreRun.startedAt,
              preRestoreRun.completedAt,
              preRestoreRun.createdAt || preRestoreRun.startedAt
            );
        } catch (insertErr) {
          console.warn('Could not record pre-restore snapshot in restored database:', insertErr);
        }
      }

      // Step 7: Checkpoint active WAL
      try {
        this.database.pragma('wal_checkpoint(TRUNCATE)');
      } catch (checkpointErr) {
        console.warn('Post-restore WAL checkpoint notice:', checkpointErr);
      }


      return {
        success: true,
        message: 'Database restored successfully',
        restoredFromRun: {
          id: verifiedTargetRun.id,
          fileName: verifiedTargetRun.fileName,
          startedAt: verifiedTargetRun.startedAt,
          recordsCount: verifiedTargetRun.recordsCount,
        },
        preRestoreRun: {
          id: preRestoreRun?.id || 'skipped',
          fileName: preRestoreRun?.fileName || null,
        },
      };

    } finally {
      this.isExecuting = false;
      if (fs.existsSync(tempRestorePath)) {
        await fs.promises.unlink(tempRestorePath).catch(() => {});
      }
    }
  }
}


export const backupService = new BackupService();
