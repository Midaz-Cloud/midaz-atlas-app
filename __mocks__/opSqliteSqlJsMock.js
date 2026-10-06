/**
 * Mock de @op-engineering/op-sqlite sobre sql.js (SQLite real compilado a WASM).
 *
 * Reemplaza la cadena de `if (sql.startsWith(...))` que simulaba cada consulta a
 * mano: con cada tabla nueva había que reimplementar su SQL en el mock y el test
 * dejaba de probar el SQL real (guardas `AND status = ?`, UNIQUE, RETURNING,
 * PRAGMA table_info de las migraciones). Aquí el SQL de los repos corre tal cual.
 *
 * Una base en memoria por `open()`; como getKioskSqliteDb cachea la conexión por
 * instancia de módulo, cada archivo de test arranca con una base vacía.
 */
const initSqlJs = require('sql.js');

let sqlPromise = null;
function getSqlJs() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs();
  }
  return sqlPromise;
}

function toBindable(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function open() {
  let dbPromise = null;
  const getDb = () => {
    if (!dbPromise) {
      dbPromise = getSqlJs().then((SQL) => new SQL.Database());
    }
    return dbPromise;
  };

  return {
    async execute(query, params = []) {
      const db = await getDb();
      const stmt = db.prepare(String(query));
      try {
        stmt.bind(params.map(toBindable));
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        const rowsAffected = db.getRowsModified();
        const last = db.exec('SELECT last_insert_rowid() AS id');
        const insertId = last[0]?.values?.[0]?.[0];
        return { rows, rowsAffected, insertId: typeof insertId === 'number' ? insertId : undefined };
      } finally {
        stmt.free();
      }
    },
    close() {
      dbPromise?.then((db) => db.close());
      dbPromise = null;
    },
  };
}

module.exports = { open };
