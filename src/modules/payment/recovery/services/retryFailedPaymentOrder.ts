import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  createKioskApiClient,
  loadAccessToken,
  mapCartToCreateOrderRequest,
} from '@shared/api/kiosk';
import type { CardPaymentPayload, CartLine } from '@shared/kiosk-order/types';
import {
  getFailedPayment,
  updateFailedPaymentStatus,
  type FailedPaymentRecord,
  type FailedPaymentStatus,
} from '@shared/persistence';

import { evaluateFailedPaymentSalvage } from './salvageFailedPayments';

/**
 * `possible_duplicate`: the original POST died without a backend response
 * (timeout/network) — the order MAY exist server-side. The UI must make the
 * operator confirm against the backend panel before firing the retry.
 * `low`: the backend answered with an error, so no order was created.
 */
export type RetryDuplicateRisk = 'low' | 'possible_duplicate';

const NETWORKISH_PATTERNS = [
  'timeout',
  'network',
  'abort',
  'socket',
  'econn',
  'enotconn',
  'failed to fetch',
  'tiempo',
];

export function classifyRetryDuplicateRisk(
  record: Pick<FailedPaymentRecord, 'errorMessage' | 'rawJson' | 'stage'>,
): RetryDuplicateRisk {
  if (record.stage !== 'order_register') {
    // pos_parse / pos_charge rows never reached the order POST.
    return 'low';
  }
  const message = record.errorMessage.toLowerCase();
  if (NETWORKISH_PATTERNS.some((pattern) => message.includes(pattern))) {
    return 'possible_duplicate';
  }
  // order_register raw_json is the HTTP error body (KioskApiError.body).
  if (record.rawJson?.includes('statusCode')) {
    return 'low';
  }
  return 'possible_duplicate';
}

/** Statuses an operator may arm for retry ('retry_failed' = manual re-arm). */
const RETRYABLE_STATUSES: FailedPaymentStatus[] = [
  'open',
  'salvaged',
  'retry_failed',
];

function resolveRetryPayload(
  record: FailedPaymentRecord,
): CardPaymentPayload | null {
  if (record.salvage?.payload) {
    return record.salvage.payload;
  }
  // Future rows persist the full payload; old pos_* rows reconstruct from raw.
  if (record.payment?.cardPayment) {
    return record.payment.cardPayment;
  }
  const evaluation = evaluateFailedPaymentSalvage({ ...record, status: 'open' });
  return evaluation.eligible ? evaluation.payload : null;
}

function rebuildCartLines(record: FailedPaymentRecord): CartLine[] {
  return (record.order?.lines ?? []).map((line, index) => ({
    lineId: `retry-${record.id}-${index}`,
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    ...(line.unitPriceVes != null ? { unitPriceVes: line.unitPriceVes } : {}),
    ...(line.taxRate != null ? { taxRate: line.taxRate } : {}),
    ...(line.isExempt != null ? { isExempt: line.isExempt } : {}),
    ...(line.appliedModifiers?.length
      ? { appliedModifiers: line.appliedModifiers }
      : {}),
  }));
}

export type RetryFailedPaymentOrderResult =
  | { ok: true; displayOrderNumber: string }
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'not_eligible'
        | 'catalog_mismatch'
        | 'already_taken'
        | 'request_failed';
      message?: string;
    };

/**
 * Manual, operator-confirmed re-POST of an order whose POS charge succeeded.
 * At-most-once: the row is atomically moved to `retry_pending` BEFORE the POST;
 * a crash mid-flight leaves it there and it is never retried automatically.
 * Never re-emits fiscal invoice nor reprints (deliberately not processKioskOrder).
 */
export async function retryFailedPaymentOrder(params: {
  id: number;
  declaresTaxes?: boolean;
}): Promise<RetryFailedPaymentOrderResult> {
  const record = await getFailedPayment(params.id);
  if (!record) {
    return { ok: false, reason: 'not_found' };
  }
  if (!RETRYABLE_STATUSES.includes(record.status)) {
    return {
      ok: false,
      reason: record.status === 'retry_pending' ? 'already_taken' : 'not_eligible',
      message: `status=${record.status}`,
    };
  }

  const payload = resolveRetryPayload(record);
  if (!payload) {
    return {
      ok: false,
      reason: 'not_eligible',
      message: 'No hay payload POS reconstruible para esta fila',
    };
  }
  const lines = rebuildCartLines(record);
  if (lines.length === 0) {
    return {
      ok: false,
      reason: 'not_eligible',
      message: 'La fila no tiene líneas de orden guardadas',
    };
  }

  // Build (pure) before taking the row: catalog gaps must not consume the arm.
  const request = mapCartToCreateOrderRequest({
    lines,
    orderType: record.order?.orderType as OrderType | undefined,
    tableNumber: record.order?.tableNumber ?? undefined,
    paymentMethodId: (record.paymentMethod ?? 'pos') as PaymentMethodId,
    customerId: record.customer?.customerId,
    cardPayment: payload,
    declaresTaxes: params.declaresTaxes,
    // Original reservation is long expired; sending it would 400.
    reservationId: null,
  });
  if (request.items.length !== lines.length) {
    return {
      ok: false,
      reason: 'catalog_mismatch',
      message: 'Producto de la orden ya no existe en el catálogo actual',
    };
  }

  const armed = await updateFailedPaymentStatus(record.id, 'retry_pending', {
    expectedStatus: record.status,
  });
  if (!armed) {
    return { ok: false, reason: 'already_taken' };
  }

  try {
    const token = await loadAccessToken();
    const client = createKioskApiClient(token ?? undefined);
    const response = await client.createOrder(request);
    await updateFailedPaymentStatus(record.id, 'retried_ok', {
      expectedStatus: 'retry_pending',
      salvage: {
        ...(record.salvage ?? {}),
        payload,
        displayOrderNumber: response.displayOrderNumber,
      },
    });
    return { ok: true, displayOrderNumber: response.displayOrderNumber };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateFailedPaymentStatus(record.id, 'retry_failed', {
      expectedStatus: 'retry_pending',
      salvage: { ...(record.salvage ?? {}), payload, retryError: message },
    });
    return { ok: false, reason: 'request_failed', message };
  }
}
