import { open, type DB } from '@op-engineering/op-sqlite';

const DB_NAME = 'midaz_kiosk.db';

let dbPromise: Promise<DB> | null = null;
let dbOverride: DB | null = null;

/** Test-only: inject a DB (e.g. `:memory:`) or clear override with null. */
export function __setKioskSqliteDbForTests(db: DB | null): void {
  dbOverride = db;
  dbPromise = null;
}

export async function getKioskSqliteDb(): Promise<DB> {
  if (dbOverride) {
    return dbOverride;
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = open({ name: DB_NAME });
      await migrateKioskSqlite(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Additive migration: CREATE TABLE IF NOT EXISTS never alters existing installs. */
async function ensureColumn(
  db: DB,
  table: string,
  column: string,
  ddl: string,
): Promise<void> {
  const info = await db.execute(`PRAGMA table_info(${table});`);
  const exists = (info.rows ?? []).some(
    (row) => (row as { name?: unknown }).name === column,
  );
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl};`);
  }
}

async function migrateKioskSqlite(db: DB): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS failed_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      display_ref TEXT NOT NULL,
      stage TEXT NOT NULL,
      payment_method TEXT,
      error_reason TEXT NOT NULL,
      error_message TEXT NOT NULL,
      customer_json TEXT,
      order_json TEXT,
      payment_json TEXT,
      raw_json TEXT
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_failed_payments_created_at
    ON failed_payments (created_at DESC);
  `);
  await ensureColumn(
    db,
    'failed_payments',
    'status',
    `status TEXT NOT NULL DEFAULT 'open'`,
  );
  await ensureColumn(
    db,
    'failed_payments',
    'status_updated_at',
    'status_updated_at TEXT',
  );
  await ensureColumn(db, 'failed_payments', 'salvage_json', 'salvage_json TEXT');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pos_successful_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      pos_reference TEXT NOT NULL,
      rrn TEXT,
      trace_number TEXT,
      amount TEXT NOT NULL,
      amount_display TEXT NOT NULL,
      device_serial TEXT,
      batch_num TEXT,
      card_type TEXT,
      raw_json TEXT,
      pos_date_time TEXT
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_pos_successful_transactions_created_at
    ON pos_successful_transactions (created_at ASC);
  `);
}
