import * as SQLite from 'expo-sqlite';

export type SavedRun = {
  id: number;
  startedAt: number; // epoch ms
  elapsedSec: number;
  distanceMeters: number;
  avgPace: number | null; // sec/mile
  targetPace: number; // sec/mile
  gpsFixes: number;
};

export type NewRun = Omit<SavedRun, 'id'>;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('ronforestron.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          elapsed_sec REAL NOT NULL,
          distance_m REAL NOT NULL,
          avg_pace REAL,
          target_pace REAL NOT NULL,
          gps_fixes INTEGER NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function saveRun(run: NewRun): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO runs
       (started_at, elapsed_sec, distance_m, avg_pace, target_pace, gps_fixes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    run.startedAt,
    run.elapsedSec,
    run.distanceMeters,
    run.avgPace,
    run.targetPace,
    run.gpsFixes,
  );
  return result.lastInsertRowId;
}

export async function listRuns(limit = 50): Promise<SavedRun[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    started_at: number;
    elapsed_sec: number;
    distance_m: number;
    avg_pace: number | null;
    target_pace: number;
    gps_fixes: number;
  }>(`SELECT * FROM runs ORDER BY started_at DESC LIMIT ?`, limit);

  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    elapsedSec: r.elapsed_sec,
    distanceMeters: r.distance_m,
    avgPace: r.avg_pace,
    targetPace: r.target_pace,
    gpsFixes: r.gps_fixes,
  }));
}

export async function deleteRun(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM runs WHERE id = ?`, id);
}
