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
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
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

// ---- Settings ---------------------------------------------------------------
export type Settings = {
  coachingWindowSec: number; // how far back "current pace" looks
  promptIntervalSec: number; // how often a spoken pace check fires
};

export const DEFAULT_SETTINGS: Settings = {
  coachingWindowSec: 60,
  promptIntervalSec: 30,
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM settings`,
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: keyof Settings) => {
    const v = map.get(k);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : DEFAULT_SETTINGS[k];
  };
  return {
    coachingWindowSec: num('coachingWindowSec'),
    promptIntervalSec: num('promptIntervalSec'),
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDb();
  for (const [key, value] of Object.entries(patch)) {
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      String(value),
    );
  }
}
