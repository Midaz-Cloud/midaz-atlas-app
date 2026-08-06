import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  createKioskApiClient,
  loadAccessToken,
  mapCartToCreateOrderRequest,
} from '@shared/api/kiosk';
import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import type { CardPaymentPayload, CartLine, OrderTotals } from '@shared/kiosk-order/types';
import { defaultOrderFiscalConfig } from '@shared/kiosk-order';
import {
  emitOrderFiscalInvoice,
  shouldEmitFiscalInvoice,
} from '@shared/peripherals/fiscal';
import { FiscalServiceError } from '@shared/peripherals/fiscal/FiscalServiceError';
import { parseEcrPaymentResponse, toEcrTerminalAmount } from '@shared/peripherals/ecr';
import { OrderPrintError, printOrderTicket } from '@shared/peripherals/printer';
import {
  deleteFailedPayment,
  getFailedPayment,
  updateFailedPaymentStatus,
  type FailedPaymentRecord,
  type FailedPaymentStatus,
} from '@shared/persistence';

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

function amountSentCentsFromOrder(
  record: FailedPaymentRecord,
): number | null {
  const totalVes = record.order?.totals?.totalVes;
  if (totalVes == null || !Number.isFinite(totalVes) || totalVes <= 0) {
    return null;
  }
  return toEcrTerminalAmount(totalVes);
}

/**
 * Rebuilds POS payload from stored USB raw + order totals.
 * Forces amount to the charged order total (Conviase): USB corruption must
 * not block reenviar when the terminal already approved.
 */
function rebuildPayloadFromRaw(
  record: FailedPaymentRecord,
): CardPaymentPayload | null {
  const raw = record.rawJson;
  if (!raw || !raw.includes('{')) {
    return null;
  }
  if (!parseEcrPaymentResponse(raw).approved) {
    return null;
  }

  const amountSentCents = amountSentCentsFromOrder(record);
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
    return null;
  }

  if (amountSentCents != null) {
    return {
      ...mapped.payload,
      posResponse: {
        ...mapped.payload.posResponse,
        amount: String(amountSentCents),
      },
    };
  }
  return mapped.payload;
}

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
  return rebuildPayloadFromRaw(record);
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

function rebuildOrderTotals(record: FailedPaymentRecord): OrderTotals {
  const snap = record.order?.totals ?? {};
  const totalVes = snap.totalVes ?? snap.totalUsd ?? 0;
  const totalUsd = snap.totalUsd ?? snap.totalVes ?? 0;
  const subtotal =
    snap.subtotalVes ?? snap.totalUsd ?? snap.totalVes ?? totalUsd;
  const tax = snap.taxVes ?? 0;
  return {
    subtotalUsd: subtotal,
    taxUsd: tax,
    totalUsd,
    totalVes,
    ...(snap.subtotalVes != null ? { subtotalVes: snap.subtotalVes } : {}),
    ...(snap.taxVes != null ? { taxVes: snap.taxVes } : {}),
  };
}

function customerDisplayName(record: FailedPaymentRecord): string {
  const first = record.customer?.firstName?.trim() ?? '';
  const last = record.customer?.lastName?.trim() ?? '';
  return `${first} ${last}`.trim();
}

export type RetryFailedPaymentOrderResult =
  | {
      ok: true;
      displayOrderNumber: string;
      /** Present when the order was registered but ticket print failed. */
      printWarning?: string;
    }
  | {
      ok: false;
      reason:
        | 'not_found'
        | 'not_eligible'
        | 'catalog_mismatch'
        | 'already_taken'
        | 'request_failed'
        | 'fiscal_failed';
      message?: string;
    };

/** Whether the admin UI should offer "Reintentar" for this row. */
export function canRetryFailedPaymentOrder(
  record: FailedPaymentRecord,
): boolean {
  if (!RETRYABLE_STATUSES.includes(record.status)) {
    return false;
  }
  if (!(record.order?.lines?.length)) {
    return false;
  }
  return resolveRetryPayload(record) != null;
}

export type RetryFailedPaymentOrderParams = {
  id: number;
  declaresTaxes?: boolean;
  usdToVesRate?: number;
  primaryCurrency?: string;
  organizationName?: string;
  organizationLegalName?: string;
  printQrEnabled?: boolean;
};

/**
 * Operator-confirmed recovery: same pipeline as a normal paid order
 * (fiscal → register → print), without re-charging the POS.
 * At-most-once: row moves to `retry_pending` before side effects.
 * On successful register the failed_payments row is deleted even if print fails.
 */
export async function retryFailedPaymentOrder(
  params: RetryFailedPaymentOrderParams,
): Promise<RetryFailedPaymentOrderResult> {
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

  const paymentMethodId = (record.paymentMethod ?? 'pos') as PaymentMethodId;
  const orderType = record.order?.orderType as OrderType | undefined;
  const tableNumber = record.order?.tableNumber ?? undefined;
  const totals = rebuildOrderTotals(record);
  const usdToVesRate =
    params.usdToVesRate ?? defaultOrderFiscalConfig.usdToVesRate;

  // Build (pure) before taking the row: catalog gaps must not consume the arm.
  const request = mapCartToCreateOrderRequest({
    lines,
    orderType,
    tableNumber,
    paymentMethodId,
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
    // 1) Fiscal (same gate as processKioskOrder)
    if (shouldEmitFiscalInvoice(params.declaresTaxes)) {
      try {
        await emitOrderFiscalInvoice({
          lines,
          customerDocumentId: record.customer?.documentId ?? '',
          customerName: customerDisplayName(record),
          paymentMethodId,
          cardPayment: payload,
          primaryCurrency: params.primaryCurrency,
          usdToVesRate,
          declaresTaxes: params.declaresTaxes,
        });
      } catch (error) {
        const message =
          error instanceof FiscalServiceError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Error al emitir la factura fiscal';
        await updateFailedPaymentStatus(record.id, 'retry_failed', {
          expectedStatus: 'retry_pending',
          salvage: { ...(record.salvage ?? {}), payload, retryError: message },
        });
        return { ok: false, reason: 'fiscal_failed', message };
      }
    }

    // 2) Register order
    const token = await loadAccessToken();
    const client = createKioskApiClient(token ?? undefined);
    const response = await client.createOrder(request);
    const displayOrderNumber = response.displayOrderNumber;
    const fromShortCode = response.shortCode?.trim() || null;
    const shouldPrintQr =
      Boolean(params.printQrEnabled) &&
      paymentMethodId !== 'cash' &&
      Boolean(fromShortCode);

    // Order exists → clear local failed row before print (print is best-effort).
    await deleteFailedPayment(record.id);

    // 3) Print ticket (same as processKioskOrder printing phase)
    try {
      await printOrderTicket({
        displayOrderNumber,
        lines,
        totals,
        usdToVesRate,
        primaryCurrency: params.primaryCurrency,
        orderType,
        tableNumber,
        organizationName: params.organizationName,
        organizationLegalName: params.organizationLegalName,
        printQrEnabled: shouldPrintQr,
        trackShortCode: shouldPrintQr ? fromShortCode : null,
        declaresTaxes: params.declaresTaxes,
      });
      return { ok: true, displayOrderNumber };
    } catch (error) {
      if (__DEV__) {
        console.warn('[retryFailedPaymentOrder] printOrderTicket failed', error);
      }
      const printWarning =
        error instanceof OrderPrintError
          ? error.message
          : 'La orden se registró pero no se pudo imprimir el comprobante';
      return { ok: true, displayOrderNumber, printWarning };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateFailedPaymentStatus(record.id, 'retry_failed', {
      expectedStatus: 'retry_pending',
      salvage: { ...(record.salvage ?? {}), payload, retryError: message },
    });
    return { ok: false, reason: 'request_failed', message };
  }
}
