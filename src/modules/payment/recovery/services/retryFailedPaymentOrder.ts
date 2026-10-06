import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  withKioskAuth,
  mapCartToCreateOrderRequest,
} from '@shared/api/kiosk';
import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';
import type {
  CardPaymentPayload,
  CartLine,
  MobilePaymentPayload,
  OrderTotals,
} from '@shared/kiosk-order/types';
import { defaultOrderFiscalConfig } from '@shared/kiosk-order';
import { deterministicUuidV4 } from '@shared/utils/uuid';
import { KioskApiError, isKioskNetworkError } from '@shared/api/kiosk/errors';
import { markKioskOffline } from '@shared/connectivity';
import type { KioskCustomer } from '@shared/customer';
import { getKioskDeviceProfile } from '@shared/device';
import { registerOrderLocally } from '@modules/payment/processing/services/registerOrderLocally';
import { OFFLINE_TICKET_FOOTER_NOTE } from '@modules/payment/processing/services/processKioskOrder';
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
  setFailedPaymentFiscalInvoiceNumber,
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

/** Red caída o backend con problemas (5xx/429): se puede dejar en la cola local. */
function isBackendUnavailable(error: unknown): boolean {
  if (isKioskNetworkError(error)) return true;
  return error instanceof KioskApiError && (error.statusCode >= 500 || error.statusCode === 429);
}

function snapshotToKioskCustomer(record: FailedPaymentRecord): KioskCustomer | null {
  const snap = record.customer;
  if (!snap?.documentId) return null;
  return {
    id: snap.customerId ?? null,
    documentId: snap.documentId,
    firstName: snap.firstName ?? '',
    lastName: snap.lastName ?? '',
    phone: snap.phone ?? '',
    email: snap.email ?? '',
  };
}

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
      shortCode?: string | null;
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

function resolveMobilePayload(
  record: FailedPaymentRecord,
): MobilePaymentPayload | null {
  return record.payment?.mobilePayment ?? null;
}

function existingRegisteredOrderNumber(
  record: FailedPaymentRecord,
): string | null {
  const value = record.order?.displayOrderNumber?.trim();
  return value ? value : null;
}

function hasRetryablePaymentEvidence(record: FailedPaymentRecord): boolean {
  if (existingRegisteredOrderNumber(record)) {
    return true;
  }
  if (resolveRetryPayload(record) != null) {
    return true;
  }
  if (resolveMobilePayload(record) != null) {
    return true;
  }
  return record.paymentMethod === 'zelle';
}

/** Whether the admin / kiosk UI should offer "Reintentar" for this row. */
export function canRetryFailedPaymentOrder(
  record: FailedPaymentRecord,
): boolean {
  if (!RETRYABLE_STATUSES.includes(record.status)) {
    return false;
  }
  if (!(record.order?.lines?.length)) {
    return false;
  }
  return hasRetryablePaymentEvidence(record);
}

export type RetryFailedPaymentOrderParams = {
  id: number;
  declaresTaxes?: boolean;
  effectiveInvoicingType?: string | null;
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
  const mobilePayload = resolveMobilePayload(record);
  const existingOrderNumber = existingRegisteredOrderNumber(record);
  const existingShortCode = record.order?.shortCode?.trim() || null;
  const lines = rebuildCartLines(record);
  if (lines.length === 0) {
    return {
      ok: false,
      reason: 'not_eligible',
      message: 'La fila no tiene líneas de orden guardadas',
    };
  }

  const paymentMethodId = (record.paymentMethod ?? 'pos') as PaymentMethodId;
  if (!hasRetryablePaymentEvidence(record)) {
    return {
      ok: false,
      reason: 'not_eligible',
      message: 'No hay payload de pago reconstruible para esta fila',
    };
  }

  const orderType = record.order?.orderType as OrderType | undefined;
  const tableNumber = record.order?.tableNumber ?? undefined;
  const totals = rebuildOrderTotals(record);
  const usdToVesRate =
    params.usdToVesRate ?? defaultOrderFiscalConfig.usdToVesRate;
  const existingFiscalInvoiceNumber =
    record.order?.fiscalInvoiceNumber != null &&
    Number.isInteger(record.order.fiscalInvoiceNumber) &&
    record.order.fiscalInvoiceNumber > 0
      ? record.order.fiscalInvoiceNumber
      : undefined;

  // Build (pure) before taking the row: catalog gaps must not consume the arm.
  // Skip POST when Midaz already has the order — only re-emit fiscal + ticket.
  const request = existingOrderNumber
    ? null
    : mapCartToCreateOrderRequest({
        lines,
        orderType,
        tableNumber,
        paymentMethodId,
        customerId: record.customer?.customerId,
        cardPayment: payload,
        mobilePayment: mobilePayload,
        declaresTaxes: params.declaresTaxes,
        // Original reservation is long expired; sending it would 400.
        reservationId: null,
        fiscalInvoiceNumber: existingFiscalInvoiceNumber,
      });
  if (request && request.items.length !== lines.length) {
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

  const persistRetryFailure = async (message: string) => {
    await updateFailedPaymentStatus(record.id, 'retry_failed', {
      expectedStatus: 'retry_pending',
      salvage: {
        ...(record.salvage ?? {}),
        ...(payload ? { payload } : {}),
        retryError: message,
      },
    });
  };

  try {
    // 1) Fiscal (same gate as processKioskOrder). Skip HkaApp if PP9+ already printed.
    let issuedFiscalInvoiceNumber = existingFiscalInvoiceNumber;
    if (
      existingFiscalInvoiceNumber == null &&
      shouldEmitFiscalInvoice(
        params.declaresTaxes,
        paymentMethodId,
        params.effectiveInvoicingType,
      )
    ) {
      try {
        const fiscalResult = await emitOrderFiscalInvoice({
          lines,
          customerDocumentId: record.customer?.documentId ?? '',
          customerName: customerDisplayName(record),
          paymentMethodId,
          cardPayment: payload ?? undefined,
          primaryCurrency: params.primaryCurrency,
          usdToVesRate,
          declaresTaxes: params.declaresTaxes,
          effectiveInvoicingType: params.effectiveInvoicingType,
        });
        const issued = fiscalResult?.issuedInvoiceNumber;
        if (issued != null && issued > 0) {
          issuedFiscalInvoiceNumber = issued;
          if (request) {
            request.fiscalInvoiceNumber = issued;
          }
          // Ya hay factura: si el registro de abajo falla, el próximo reintento
          // NO debe volver a emitir otra por el mismo cobro.
          await setFailedPaymentFiscalInvoiceNumber(record.id, issued).catch(() => undefined);
        }
      } catch (error) {
        const message =
          error instanceof FiscalServiceError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Error al emitir la factura fiscal';
        await persistRetryFailure(message);
        return { ok: false, reason: 'fiscal_failed', message };
      }
    }

    // 2) Register order only when Midaz does not already have it.
    // No PATCH for fiscalInvoiceNumber exists on the kiosk API.
    let displayOrderNumber = existingOrderNumber ?? '';
    let fromShortCode = existingShortCode;
    let registeredLocally = false;
    if (request) {
      // Id estable por fila: reintentar la misma fila nunca crea una segunda orden.
      const clientOrderId = deterministicUuidV4(`failed-payment:${record.id}:${record.createdAt}`);
      try {
        const response = await withKioskAuth((client) =>
          client.createOrder({ ...request, clientOrderId }, { idempotencyKey: clientOrderId }),
        );
        displayOrderNumber = response.displayOrderNumber;
        fromShortCode = response.shortCode?.trim() || null;
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          throw error;
        }
        // Cobrado y facturado, pero sin backend: igual que una venta offline,
        // queda en la cola con número local y comanda para cocina por LAN; el
        // worker la sincroniza sola (mismo clientOrderId → sin duplicado).
        const device = await getKioskDeviceProfile();
        const local = await registerOrderLocally({
          request,
          clientOrderId,
          deviceSerial: device.serialNumber,
          lines,
          paidAt: record.createdAt,
          exchangeRate: usdToVesRate,
          grandTotalVES: totals.totalVes,
          customer: snapshotToKioskCustomer(record),
          customerName: customerDisplayName(record),
          origin: 'register_failed',
          ticket: {
            displayOrderNumber: '',
            lines,
            totals,
            usdToVesRate,
            primaryCurrency: params.primaryCurrency,
            orderType,
            tableNumber,
            organizationName: params.organizationName,
            organizationLegalName: params.organizationLegalName,
            declaresTaxes: params.declaresTaxes,
          },
          fiscalInvoiceNumber: issuedFiscalInvoiceNumber,
          posReference: payload?.posReference ?? null,
        });
        displayOrderNumber = local.localNumber;
        fromShortCode = null;
        registeredLocally = true;
        markKioskOffline(error instanceof Error ? error.message : 'createOrder failed');
      }
    } else if (__DEV__ && issuedFiscalInvoiceNumber != null) {
      console.info(
        '[retryFailedPaymentOrder] skipped createOrder; order already exists',
        `displayOrderNumber=${displayOrderNumber}`,
        `fiscalInvoiceNumber=${issuedFiscalInvoiceNumber}`,
      );
    }

    const shouldPrintQr =
      Boolean(params.printQrEnabled) &&
      paymentMethodId !== 'cash' &&
      Boolean(fromShortCode);

    // Order exists → clear local failed row before print (print is best-effort).
    // Registrada en la cola local: la fila queda como resuelta (el outbox la sincroniza).
    if (registeredLocally) {
      await updateFailedPaymentStatus(record.id, 'retried_ok', { expectedStatus: 'retry_pending' });
    } else {
      await deleteFailedPayment(record.id);
    }

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
        footerNote: registeredLocally ? OFFLINE_TICKET_FOOTER_NOTE : undefined,
      });
      return { ok: true, displayOrderNumber, shortCode: fromShortCode };
    } catch (error) {
      if (__DEV__) {
        console.warn('[retryFailedPaymentOrder] printOrderTicket failed', error);
      }
      const printWarning =
        error instanceof OrderPrintError
          ? error.message
          : 'La orden se registró pero no se pudo imprimir el comprobante';
      return {
        ok: true,
        displayOrderNumber,
        shortCode: fromShortCode,
        printWarning,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await persistRetryFailure(message);
    return { ok: false, reason: 'request_failed', message };
  }
}
