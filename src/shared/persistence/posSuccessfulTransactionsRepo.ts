import { getKioskSqliteDb } from './sqliteDb';
import type {
  SuccessfulPosTransactionInput,
  SuccessfulPosTransactionRecord,
} from './types';

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

function mapRow(row: Record<string, unknown>): SuccessfulPosTransactionRecord {
  return {
    id: asNumber(row.id) ?? 0,
    createdAt: asString(row.created_at) ?? '',
    posReference: asString(row.pos_reference) ?? '',
    rrn: asString(row.rrn),
    traceNumber: asString(row.trace_number),
    amount: asString(row.amount) ?? '',
    amountDisplay: asString(row.amount_display) ?? '',
    deviceSerial: asString(row.device_serial),
    batchNum: asString(row.batch_num),
    cardType: asString(row.card_type),
    rawJson: asString(row.raw_json),
    posDateTime: asString(row.pos_date_time),
  };
}

export async function recordSuccessfulPosTransaction(
  input: SuccessfulPosTransactionInput,
): Promise<number> {
  const db = await getKioskSqliteDb();
  const createdAt = new Date().toISOString();
  const result = await db.execute(
    `
    INSERT INTO pos_successful_transactions (
      created_at, pos_reference, rrn, trace_number,
      amount, amount_display, device_serial, batch_num,
      card_type, raw_json, pos_date_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      createdAt,
      input.posReference,
      input.rrn ?? null,
      input.traceNumber ?? null,
      input.amount,
      input.amountDisplay,
      input.deviceSerial ?? null,
      input.batchNum ?? null,
      input.cardType ?? null,
      input.rawJson ?? null,
      input.posDateTime ?? null,
    ],
  );

  const id = result.insertId;
  if (id == null || !Number.isFinite(id)) {
    throw new Error('pos_successful_transactions insert did not return insertId');
  }
  return id;
}

/** Fire-and-forget — never throws to callers. */
export function recordSuccessfulPosTransactionSafe(
  input: SuccessfulPosTransactionInput,
): void {
  void recordSuccessfulPosTransaction(input).catch((error) => {
    console.warn('[posSuccessfulTransactions] record failed', error);
  });
}

/** Dedupe guard for salvage: find an already-recorded charge by RRN or trace. */
export async function findSuccessfulPosTransactionByRrn(
  rrn: string | null | undefined,
  traceNumber?: string | null,
): Promise<SuccessfulPosTransactionRecord | null> {
  if (!rrn && !traceNumber) {
    return null;
  }
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `
    SELECT *
    FROM pos_successful_transactions
    WHERE rrn = ? OR trace_number = ?
    LIMIT 1;
    `,
    [rrn ?? '', traceNumber ?? ''],
  );
  const row = result.rows?.[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}

/** Chronological order for settlement ticket. */
export async function listSuccessfulPosTransactions(): Promise<
  SuccessfulPosTransactionRecord[]
> {
  const db = await getKioskSqliteDb();
  const result = await db.execute(
    `
    SELECT *
    FROM pos_successful_transactions
    ORDER BY id ASC;
    `,
  );
  return (result.rows ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** Clears local lot after successful POS batch settlement. */
export async function clearSuccessfulPosTransactions(): Promise<void> {
  const db = await getKioskSqliteDb();
  await db.execute(`DELETE FROM pos_successful_transactions;`);
}
