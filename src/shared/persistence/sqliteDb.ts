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
  // Cruce cobro ↔ venta: permite saber en el cierre de lote qué cobros aún no
  // llegaron al backend.
  await ensureColumn(
    db,
    'pos_successful_transactions',
    'client_order_id',
    'client_order_id TEXT',
  );

  // ── Kiosko offline ────────────────────────────────────────────────
  // Ventas cerradas sin backend (o cuyo registro falló) que esperan
  // sincronizarse con POST /kiosk/orders. `payload_json` guarda el request
  // completo: al sincronizar se reenvía tal cual con su clientOrderId.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_order_id TEXT NOT NULL UNIQUE,
      local_number TEXT NOT NULL,
      local_seq INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      payment_method TEXT NOT NULL,
      origin TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT,
      last_error TEXT,
      last_error_status INTEGER,
      synced_at TEXT,
      synced_order_id INTEGER,
      synced_display_number TEXT,
      synced_short_code TEXT,
      comanda_status_local TEXT NOT NULL DEFAULT 'pending',
      fiscal_invoice_number INTEGER,
      pos_reference TEXT
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_order_outbox_status_id
    ON order_outbox (status, id ASC);
  `);

  // Contadores monotónicos del kiosko (número de orden local). Nunca se reinician.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kiosk_counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  // Clientes vistos en este kiosko: caché para identificar al cliente sin red.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS local_customers (
      document_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      backend_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Comandas que el kiosko sirve por LAN a la Comandera mientras no hay backend.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS local_comandas (
      id TEXT PRIMARY KEY,
      client_order_id TEXT NOT NULL UNIQUE,
      local_number TEXT NOT NULL,
      local_seq INTEGER NOT NULL,
      short_code TEXT NOT NULL,
      table_number TEXT,
      fulfillment_type TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      customer_name TEXT,
      items_snapshot_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ready_at TEXT,
      synced_comanda_id TEXT,
      synced_order_id INTEGER
    );
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_local_comandas_updated_at
    ON local_comandas (updated_at ASC);
  `);
}
