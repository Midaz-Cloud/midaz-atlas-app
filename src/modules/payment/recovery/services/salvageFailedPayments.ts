import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import type { CardPaymentPayload } from '@shared/kiosk-order/types';
import { parseEcrPaymentResponse, toEcrTerminalAmount } from '@shared/peripherals/ecr';
import {
  buildSuccessfulPosTransactionInput,
  findSuccessfulPosTransactionByRrn,
  getFailedPayment,
  listFailedPaymentRecordsByStatus,
  recordSuccessfulPosTransaction,
  updateFailedPaymentStatus,
  type FailedPaymentRecord,
} from '@shared/persistence';

export type SalvageSkipReason =
  | 'status_not_open'
  | 'stage_not_pos'
  | 'not_pos_method'
  | 'no_raw_response'
  | 'not_approved'
  | 'unmappable'
  | 'amount_mismatch';

export type FailedPaymentSalvageEvaluation =
  | {
      eligible: true;
      payload: CardPaymentPayload;
      /** Céntimos que se habrían cobrado según order_json; null si no hay snapshot. */
      amountSentCents: number | null;
    }
  | { eligible: false; reason: SalvageSkipReason; message?: string };

const POS_STAGES = new Set(['pos_parse', 'pos_charge']);
const POS_METHODS = new Set(['pos', 'credito']);

/**
 * Re-runs the CURRENT parser over a stored failed_payments row and decides if
 * it was actually an approved POS charge (misclassified by an older parser).
 *
 * `order_register` rows are intentionally NOT eligible: their POS transaction
 * was already recorded in pos_successful_transactions before the order POST —
 * they only need the order retry flow.
 *
 * NOTE: amountSentCents is recomputed as toEcrTerminalAmount(totals.totalVes)
 * on purpose, without resolvePosChargeAmountVes — that helper reads the
 * *current* test-charge override, which must not distort historical rows.
 */
export function evaluateFailedPaymentSalvage(
  record: FailedPaymentRecord,
): FailedPaymentSalvageEvaluation {
  if (record.status !== 'open') {
    return { eligible: false, reason: 'status_not_open' };
  }
  if (!POS_STAGES.has(record.stage)) {
    return { eligible: false, reason: 'stage_not_pos' };
  }
  if (record.paymentMethod != null && !POS_METHODS.has(record.paymentMethod)) {
    return { eligible: false, reason: 'not_pos_method' };
  }
  const raw = record.rawJson;
  if (!raw || !raw.includes('{')) {
    return { eligible: false, reason: 'no_raw_response' };
  }

  if (!parseEcrPaymentResponse(raw).approved) {
    return { eligible: false, reason: 'not_approved' };
  }

  const totalVes = record.order?.totals?.totalVes;
  const amountSentCents =
    totalVes != null && Number.isFinite(totalVes) && totalVes > 0
      ? toEcrTerminalAmount(totalVes)
      : null;

  const mapped = buildPosPaymentFromEcr({
    rawEcrResponse: raw,
    customer: {
      documentId: record.customer?.documentId ?? '',
      firstName: record.customer?.firstName ?? '',
      lastName: record.customer?.lastName ?? '',
      phone: record.customer?.phone ?? '',
    },
    payerDocumentId:
      record.payment?.cedula ?? record.customer?.documentId ?? '',
    paymentMethodId: record.paymentMethod === 'credito' ? 'credito' : 'pos',
    ...(amountSentCents != null ? { amountSentCents } : {}),
    skipSideEffects: true,
  });
  if (!mapped.ok) {
    return { eligible: false, reason: 'unmappable', message: mapped.message };
  }

  if (
    amountSentCents != null &&
    mapped.payload.posResponse.amount !== String(amountSentCents)
  ) {
    return {
      eligible: false,
      reason: 'amount_mismatch',
      message: `USB ${mapped.payload.posResponse.amount} ≠ cobrado ${amountSentCents}`,
    };
  }

  return { eligible: true, payload: mapped.payload, amountSentCents };
}

export type SalvageFailedPaymentsResult = {
  scanned: number;
  salvaged: Array<{ id: number; posTransactionId: number | null }>;
  skipped: Array<{ id: number; reason: SalvageSkipReason; message?: string }>;
};

type SalvageRowOutcome =
  | { salvaged: true; posTransactionId: number | null }
  | { salvaged: false; reason: SalvageSkipReason; message?: string };

async function salvageRecord(row: FailedPaymentRecord): Promise<SalvageRowOutcome> {
  const evaluation = evaluateFailedPaymentSalvage(row);
  if (!evaluation.eligible) {
    return {
      salvaged: false,
      reason: evaluation.reason,
      ...(evaluation.message ? { message: evaluation.message } : {}),
    };
  }

  const { payload } = evaluation;
  const existing = await findSuccessfulPosTransactionByRrn(
    payload.posResponse.RRN,
    payload.posResponse.traceNumber,
  );

  let posTransactionId: number | null = existing?.id ?? null;
  if (existing == null) {
    posTransactionId = await recordSuccessfulPosTransaction(
      buildSuccessfulPosTransactionInput({ payload, rawJson: row.rawJson }),
    );
  }

  const transitioned = await updateFailedPaymentStatus(row.id, 'salvaged', {
    expectedStatus: 'open',
    salvage: {
      payload,
      ...(posTransactionId != null ? { posTransactionId } : {}),
      ...(existing != null ? { note: 'already_recorded' } : {}),
    },
  });
  if (!transitioned) {
    return { salvaged: false, reason: 'status_not_open' };
  }
  return { salvaged: true, posTransactionId };
}

/** Single-row variant for the admin detail screen. */
export async function salvageFailedPaymentById(
  id: number,
): Promise<SalvageRowOutcome> {
  const row = await getFailedPayment(id);
  if (!row) {
    return { salvaged: false, reason: 'status_not_open', message: 'No existe' };
  }
  return salvageRecord(row);
}

/**
 * Reclassifies stored approved-but-misfiled POS charges into
 * pos_successful_transactions (settlement lot). Local-only, idempotent:
 * rows leave 'open' on success and RRN/trace dedupe guards double inserts.
 * The original failed_payments row is never deleted (audit trail).
 */
export async function salvageFailedPayments(): Promise<SalvageFailedPaymentsResult> {
  const rows = await listFailedPaymentRecordsByStatus('open');
  const result: SalvageFailedPaymentsResult = {
    scanned: rows.length,
    salvaged: [],
    skipped: [],
  };

  for (const row of rows) {
    const outcome = await salvageRecord(row);
    if (outcome.salvaged) {
      result.salvaged.push({ id: row.id, posTransactionId: outcome.posTransactionId });
    } else {
      result.skipped.push({
        id: row.id,
        reason: outcome.reason,
        ...(outcome.message ? { message: outcome.message } : {}),
      });
    }
  }

  return result;
}
