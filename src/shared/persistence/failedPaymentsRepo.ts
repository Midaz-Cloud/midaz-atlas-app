import { getKioskSqliteDb } from './sqliteDb';
import {
  formatFailedPaymentDisplayRef,
  safeJsonParse,
  safeJsonStringify,
} from './failedPaymentMappers';
import type {
  FailedPaymentCustomerSnapshot,
  FailedPaymentInput,
  FailedPaymentMethodSnapshot,
  FailedPaymentOrderSnapshot,
  FailedPaymentRecord,
  FailedPaymentStage,
  FailedPaymentSummary,
} from './types';
import { FAILED_PAYMENTS_MAX_ROWS } from './types';

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapRow(row: Record<string, unknown>): FailedPaymentRecord {
  const id = asNumber(row.id) ?? 0;
  const customerJson = asString(row.customer_json);
  const orderJson = asString(row.order_json);
  const paymentJson = asString(row.payment_json);
  const rawJson = asString(row.raw_json);
  const displayRef =
    asString(row.display_ref) ?? formatFailedPaymentDisplayRef(id);
  return {
    id,
    displayRef,
    createdAt: asString(row.created_at) ?? '',
    stage: (asString(row.stage) as FailedPaymentStage) ?? 'unknown',
    paymentMethod: asString(row.payment_method),
    errorReason: asString(row.error_reason) ?? '',
    errorMessage: asString(row.error_message) ?? '',
    customerJson,
    orderJson,
    paymentJson,
    rawJson,
    customer: safeJsonParse<FailedPaymentCustomerSnapshot>(customerJson),
    order: safeJsonParse<FailedPaymentOrderSnapshot>(orderJson),
    payment: safeJsonParse<FailedPaymentMethodSnapshot>(paymentJson),
  };
}

async function pruneFailedPayments(): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(
    `
    DELETE FROM failed_payments
    WHERE id NOT IN (
      SELECT id FROM failed_payments
      ORDER BY id DESC
      LIMIT ?
    );
    `,
    [FAILED_PAYMENTS_MAX_ROWS],
  );
}

/**
 * Persist a failed payment event. Best-effort — callers should not await for UX.
 */
export async function recordFailedPayment(
  input: FailedPaymentInput,
): Promise<number> {
  const db = await getKioskSqliteDb();
  const createdAt = new Date().toISOString();
  const placeholderRef = 'FP-PENDING';
  const result = await db.execute(
    `
    INSERT INTO failed_payments (
      created_at, display_ref, stage, payment_method,
      error_reason, error_message,
      customer_json, order_json, payment_json, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      createdAt,
      placeholderRef,
      input.stage,
      input.paymentMethod ?? null,
      input.errorReason,
      input.errorMessage,
      safeJsonStringify(input.customer),
      safeJsonStringify(input.order),
      safeJsonStringify(input.payment),
      input.rawJson ?? null,
    ],
  );

  const id = result.insertId;
  if (id == null || !Number.isFinite(id)) {
    throw new Error('failed_payments insert did not return insertId');
  }

  const displayRef = formatFailedPaymentDisplayRef(id);
  await db.execute(`UPDATE failed_payments SET display_ref = ? WHERE id = ?;`, [
    displayRef,
    id,
  ]);
  await pruneFailedPayments();
  return id;
}

/** Fire-and-forget wrapper — never throws to callers. */
export function recordFailedPaymentSafe(input: FailedPaymentInput): void {
  void recordFailedPayment(input).catch((error) => {
    console.warn('[failedPayments] record failed', error);
  });
}

export async function listFailedPaymentSummaries(): Promise<
  FailedPaymentSummary[]
> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `
    SELECT id, display_ref, created_at
    FROM failed_payments
    ORDER BY id DESC;
    `,
  );
  return (result.rows ?? []).map((row) => {
    const id = asNumber(row.id) ?? 0;
    return {
      id,
      displayRef: asString(row.display_ref) ?? formatFailedPaymentDisplayRef(id),
      createdAt: asString(row.created_at) ?? '',
    };
  });
}

export async function getFailedPayment(
  id: number,
): Promise<FailedPaymentRecord | null> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `SELECT * FROM failed_payments WHERE id = ? LIMIT 1;`,
    [id],
  );
  const row = result.rows?.[0];
  if (!row) {
    return null;
  }
  return mapRow(row as Record<string, unknown>);
}
