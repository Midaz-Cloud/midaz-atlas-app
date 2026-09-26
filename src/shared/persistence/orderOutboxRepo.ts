import { getKioskSqliteDb } from './sqliteDb';
import { parseJsonOrNull, rowNumber, rowString } from './rowValues';
import type {
  LocalComandaStatus,
  OrderOutboxInput,
  OrderOutboxOrigin,
  OrderOutboxPendingCounts,
  OrderOutboxRecord,
  OrderOutboxStatus,
} from './types';

function asOutboxStatus(value: unknown): OrderOutboxStatus {
  const raw = rowString(value);
  return raw === 'syncing' || raw === 'synced' || raw === 'failed' ? raw : 'queued';
}

function asComandaStatus(value: unknown): LocalComandaStatus {
  const raw = rowString(value);
  return raw === 'in_progress' || raw === 'ready' ? raw : 'pending';
}

function mapRow(row: Record<string, unknown>): OrderOutboxRecord {
  return {
    id: rowNumber(row.id) ?? 0,
    clientOrderId: rowString(row.client_order_id) ?? '',
    localNumber: rowString(row.local_number) ?? '',
    localSeq: rowNumber(row.local_seq) ?? 0,
    createdAt: rowString(row.created_at) ?? '',
    paidAt: rowString(row.paid_at),
    paymentMethod: rowString(row.payment_method) ?? '',
    origin: (rowString(row.origin) as OrderOutboxOrigin) ?? 'offline',
    payload: parseJsonOrNull<unknown>(row.payload_json),
    status: asOutboxStatus(row.status),
    attempts: rowNumber(row.attempts) ?? 0,
    nextAttemptAt: rowString(row.next_attempt_at),
    lastError: rowString(row.last_error),
    lastErrorStatus: rowNumber(row.last_error_status),
    syncedAt: rowString(row.synced_at),
    syncedOrderId: rowNumber(row.synced_order_id),
    syncedDisplayNumber: rowString(row.synced_display_number),
    syncedShortCode: rowString(row.synced_short_code),
    comandaStatusLocal: asComandaStatus(row.comanda_status_local),
    fiscalInvoiceNumber: rowNumber(row.fiscal_invoice_number),
    posReference: rowString(row.pos_reference),
  };
}

/**
 * Encola una venta para sincronizar. Idempotente por `clientOrderId`: encolar dos
 * veces la misma venta (p.ej. doble tap) devuelve la fila existente sin duplicar.
 */
export async function enqueueOrderOutbox(input: OrderOutboxInput): Promise<OrderOutboxRecord> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `INSERT OR IGNORE INTO order_outbox (
      client_order_id, local_number, local_seq, created_at, paid_at, payment_method,
      origin, payload_json, status, last_error, last_error_status,
      fiscal_invoice_number, pos_reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.clientOrderId,
      input.localNumber,
      input.localSeq,
      new Date().toISOString(),
      input.paidAt,
      input.paymentMethod,
      input.origin,
      JSON.stringify(input.payload ?? null),
      input.initialStatus ?? 'queued',
      input.lastError ?? null,
      input.lastErrorStatus ?? null,
      input.fiscalInvoiceNumber ?? null,
      input.posReference ?? null,
    ],
  );
  const row = await getOrderOutboxByClientOrderId(input.clientOrderId);
  if (!row) {
    throw new Error(`No se pudo encolar la venta ${input.clientOrderId}`);
  }
  return row;
}

export async function getOrderOutbox(id: number): Promise<OrderOutboxRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(`SELECT * FROM order_outbox WHERE id = ?;`, [id]);
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function getOrderOutboxByClientOrderId(
  clientOrderId: string,
): Promise<OrderOutboxRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(`SELECT * FROM order_outbox WHERE client_order_id = ?;`, [
    clientOrderId,
  ]);
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function listOrderOutbox(filter?: {
  statuses?: OrderOutboxStatus[];
  limit?: number;
}): Promise<OrderOutboxRecord[]> {
  const db = await getKioskSqliteDb();
  const statuses = filter?.statuses?.length ? filter.statuses : null;
  const where = statuses ? `WHERE status IN (${statuses.map(() => '?').join(', ')})` : '';
  const result = await db.execute(
    `SELECT * FROM order_outbox ${where} ORDER BY id DESC LIMIT ?;`,
    [...(statuses ?? []), filter?.limit ?? 200],
  );
  return (result.rows ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** Próxima venta a sincronizar (FIFO) cuyo backoff ya venció. */
export async function nextQueuedOrderOutbox(nowIso: string): Promise<OrderOutboxRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `SELECT * FROM order_outbox
     WHERE status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY id ASC LIMIT 1;`,
    [nowIso],
  );
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

/**
 * Toma la fila para sincronizarla. La guarda `AND status = ?` hace el envío
 * at-most-once aunque dos drenados corran a la vez (mismo patrón que
 * updateFailedPaymentStatus).
 */
export async function claimOrderOutboxForSync(
  id: number,
  expected: 'queued' | 'failed' = 'queued',
): Promise<boolean> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `UPDATE order_outbox SET status = 'syncing' WHERE id = ? AND status = ?;`,
    [id, expected],
  );
  return (result.rowsAffected ?? 0) > 0;
}

export async function markOrderOutboxSynced(
  id: number,
  synced: { orderId: number | null; displayOrderNumber: string | null; shortCode: string | null },
): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `UPDATE order_outbox SET status = 'synced', synced_at = ?, synced_order_id = ?,
       synced_display_number = ?, synced_short_code = ?, last_error = NULL, last_error_status = NULL
     WHERE id = ?;`,
    [new Date().toISOString(), synced.orderId, synced.displayOrderNumber, synced.shortCode, id],
  );
}

/** Falla transitoria (red, 5xx): vuelve a la cola con backoff. */
export async function markOrderOutboxRetry(
  id: number,
  retry: { error: string; httpStatus?: number | null; nextAttemptAt: string },
): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `UPDATE order_outbox SET status = 'queued', attempts = attempts + 1, next_attempt_at = ?,
       last_error = ?, last_error_status = ?
     WHERE id = ?;`,
    [retry.nextAttemptAt, retry.error, retry.httpStatus ?? null, id],
  );
}

/** El backend rechazó la venta (4xx): queda para revisión en el panel admin. */
export async function markOrderOutboxFailed(
  id: number,
  failure: { error: string; httpStatus?: number | null },
): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `UPDATE order_outbox SET status = 'failed', attempts = attempts + 1,
       last_error = ?, last_error_status = ?
     WHERE id = ?;`,
    [failure.error, failure.httpStatus ?? null, id],
  );
}

/** Botón admin "Reencolar": una venta fallida vuelve a intentarse ya. */
export async function requeueOrderOutbox(id: number): Promise<boolean> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `UPDATE order_outbox SET status = 'queued', next_attempt_at = NULL
     WHERE id = ? AND status = 'failed';`,
    [id],
  );
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Una fila quedó en `syncing` porque la app murió a mitad del envío. Al arrancar
 * se devuelve a la cola: reenviarla es seguro porque el backend es idempotente
 * por clientOrderId.
 */
export async function releaseStaleSyncingOrderOutbox(): Promise<number> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(`UPDATE order_outbox SET status = 'queued' WHERE status = 'syncing';`);
  return result.rowsAffected ?? 0;
}

export async function setOrderOutboxComandaStatus(
  clientOrderId: string,
  status: LocalComandaStatus,
): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(`UPDATE order_outbox SET comanda_status_local = ? WHERE client_order_id = ?;`, [
    status,
    clientOrderId,
  ]);
}

export async function countOrderOutboxPending(): Promise<OrderOutboxPendingCounts> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `SELECT status, COUNT(*) AS n FROM order_outbox
     WHERE status IN ('queued', 'syncing', 'failed') GROUP BY status;`,
  );
  const counts: OrderOutboxPendingCounts = { queued: 0, syncing: 0, failed: 0 };
  for (const raw of result.rows ?? []) {
    const row = raw as Record<string, unknown>;
    const status = rowString(row.status);
    if (status === 'queued' || status === 'syncing' || status === 'failed') {
      counts[status] = rowNumber(row.n) ?? 0;
    }
  }
  return counts;
}

/** Borra ventas ya sincronizadas hace más de N días (las pendientes nunca se borran). */
export async function pruneSyncedOrderOutbox(olderThanDays = 30): Promise<number> {
  const db = await getKioskSqliteDb();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await db.execute(
    `DELETE FROM order_outbox WHERE status = 'synced' AND synced_at < ?;`,
    [cutoff],
  );
  return result.rowsAffected ?? 0;
}
