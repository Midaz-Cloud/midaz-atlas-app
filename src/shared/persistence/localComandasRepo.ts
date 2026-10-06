import { getKioskSqliteDb } from './sqliteDb';
import { parseJsonOrNull, rowNumber, rowString } from './rowValues';
import type {
  LocalComandaInput,
  LocalComandaItem,
  LocalComandaRecord,
  LocalComandaStatus,
} from './types';

const STATUS_ORDER: Record<LocalComandaStatus, number> = { pending: 0, in_progress: 1, ready: 2 };

export function isLocalComandaStatus(value: unknown): value is LocalComandaStatus {
  return value === 'pending' || value === 'in_progress' || value === 'ready';
}

/** id con el que la comanda se expone por LAN (distinto de los uuid del backend). */
export function localComandaId(clientOrderId: string): string {
  return `local:${clientOrderId}`;
}

function mapRow(row: Record<string, unknown>): LocalComandaRecord {
  const status = rowString(row.status);
  return {
    id: rowString(row.id) ?? '',
    clientOrderId: rowString(row.client_order_id) ?? '',
    localNumber: rowString(row.local_number) ?? '',
    localSeq: rowNumber(row.local_seq) ?? 0,
    shortCode: rowString(row.short_code) ?? '',
    tableNumber: rowString(row.table_number),
    fulfillmentType: rowString(row.fulfillment_type) ?? '',
    paymentMethod: rowString(row.payment_method) ?? '',
    paymentStatus: rowString(row.payment_status) === 'unpaid' ? 'unpaid' : 'paid',
    customerName: rowString(row.customer_name),
    items: parseJsonOrNull<LocalComandaItem[]>(row.items_snapshot_json) ?? [],
    status: isLocalComandaStatus(status) ? status : 'pending',
    createdAt: rowString(row.created_at) ?? '',
    updatedAt: rowString(row.updated_at) ?? '',
    readyAt: rowString(row.ready_at),
    syncedComandaId: rowString(row.synced_comanda_id),
    syncedOrderId: rowNumber(row.synced_order_id),
  };
}

/** Idempotente por clientOrderId: registrar dos veces la misma venta no duplica la comanda. */
export async function insertLocalComanda(input: LocalComandaInput): Promise<LocalComandaRecord> {
  const db = await getKioskSqliteDb();
  const now = new Date().toISOString();
  const id = localComandaId(input.clientOrderId);
  await db.execute(
    `INSERT OR IGNORE INTO local_comandas (
      id, client_order_id, local_number, local_seq, short_code, table_number, fulfillment_type,
      payment_method, payment_status, customer_name, items_snapshot_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);`,
    [
      id,
      input.clientOrderId,
      input.localNumber,
      input.localSeq,
      input.localNumber,
      input.tableNumber,
      input.fulfillmentType,
      input.paymentMethod,
      input.paymentStatus,
      input.customerName,
      JSON.stringify(input.items),
      now,
      now,
    ],
  );
  const row = await getLocalComanda(id);
  if (!row) {
    throw new Error(`No se pudo guardar la comanda local ${id}`);
  }
  return row;
}

export async function getLocalComanda(id: string): Promise<LocalComandaRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(`SELECT * FROM local_comandas WHERE id = ?;`, [id]);
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function getLocalComandaByClientOrderId(
  clientOrderId: string,
): Promise<LocalComandaRecord | null> {
  return getLocalComanda(localComandaId(clientOrderId));
}

/** Comandas modificadas después de `since` (cursor de la Comandera), por orden de creación. */
export async function listLocalComandas(filter: {
  since?: string | null;
  limit?: number;
} = {}): Promise<LocalComandaRecord[]> {
  const db = await getKioskSqliteDb();
  const since = filter.since ?? new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const result = await db.execute(
    `SELECT * FROM local_comandas WHERE updated_at > ? ORDER BY created_at ASC LIMIT ?;`,
    [since, filter.limit ?? 200],
  );
  return (result.rows ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/**
 * Cambia el estado que marca cocina. No permite retroceder (ready → pending):
 * dos Comanderas o un reintento tardío no deshacen lo que cocina ya marcó.
 * Devuelve la comanda actualizada, o null si no existe.
 */
export async function updateLocalComandaStatus(
  id: string,
  status: LocalComandaStatus,
): Promise<LocalComandaRecord | null> {
  const current = await getLocalComanda(id);
  if (!current) {
    return null;
  }
  if (STATUS_ORDER[status] <= STATUS_ORDER[current.status]) {
    return current;
  }
  const db = await getKioskSqliteDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE local_comandas SET status = ?, updated_at = ?, ready_at = CASE WHEN ? = 'ready' THEN ? ELSE ready_at END
     WHERE id = ?;`,
    [status, now, status, now, id],
  );
  return getLocalComanda(id);
}

/** Tras sincronizar la venta: la comanda remota ya existe; se sigue sirviendo 48 h para que la Comandera la reconcilie. */
export async function setLocalComandaSynced(
  clientOrderId: string,
  synced: { comandaId?: string | null; orderId?: number | null },
): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `UPDATE local_comandas SET synced_comanda_id = ?, synced_order_id = ?, updated_at = ?
     WHERE client_order_id = ?;`,
    [synced.comandaId ?? null, synced.orderId ?? null, new Date().toISOString(), clientOrderId],
  );
}

export async function pruneLocalComandas(olderThanHours = 48): Promise<number> {
  const db = await getKioskSqliteDb();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const result = await db.execute(
    `DELETE FROM local_comandas WHERE updated_at < ? AND synced_order_id IS NOT NULL;`,
    [cutoff],
  );
  return result.rowsAffected ?? 0;
}
