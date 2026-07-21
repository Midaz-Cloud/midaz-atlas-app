import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  createKioskApiClient,
  KioskApiError,
  mapCartToCreateOrderRequest,
  loadAccessToken,
} from '@shared/api/kiosk';
import type {
  CardPaymentPayload,
  CartLine,
  MobilePaymentPayload,
  OrderTotals,
} from '@shared/kiosk-order/types';
import {
  getDemoProcessingOutcome,
  getDemoProcessingPhaseDelayMs,
  isKioskDemoMode,
  shouldUseMockApi,
} from '@shared/config';
import {
  emitOrderFiscalInvoice,
  shouldEmitFiscalInvoice,
} from '@shared/peripherals/fiscal';
import { FiscalServiceError } from '@shared/peripherals/fiscal/FiscalServiceError';
import { printOrderTicket, OrderPrintError } from '@shared/peripherals/printer';

import type { OrderProcessingPhase, ProcessKioskOrderResult } from '../types';

export type ProcessKioskOrderParams = {
  lines: CartLine[];
  totals: OrderTotals;
  usdToVesRate: number;
  primaryCurrency?: string;
  paymentMethodId?: PaymentMethodId;
  orderType?: OrderType;
  tableNumber?: string;
  organizationName?: string;
  organizationLegalName?: string;
  customerId?: number;
  /** Documento del cliente de facturación (P8), no el del pagador POS/móvil. */
  customerDocumentId?: string;
  customerName?: string;
  customerAddress?: string;
  mobilePayment?: MobilePaymentPayload | null;
  cardPayment?: CardPaymentPayload | null;
  printQrEnabled?: boolean;
  declaresTaxes?: boolean;
  reservationId?: string | null;
  onOrderRegistered?: (
    displayOrderNumber: string,
    grandTotalVES: number,
    grandTotalCurrency: number,
    currencyCode: string,
  ) => void;
  onReservationExpired?: () => void;
};

function buildProcessingPhases(declaresTaxes?: boolean): OrderProcessingPhase[] {
  const phases: OrderProcessingPhase[] = [];
  if (shouldEmitFiscalInvoice(declaresTaxes)) {
    phases.push('fiscal');
  }
  phases.push('registering', 'printing');
  return phases;
}

function isReservationExpiredError(error: unknown): boolean {
  if (!(error instanceof KioskApiError) || error.statusCode !== 400) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('reserv') || message.includes('reservation');
}

function buildProvisionalOrderNumber(): string {
  return `K-${Date.now().toString().slice(-6)}`;
}

/**
 * P13: emite factura fiscal (HkaApp), registra en API e imprime ticket de orden.
 * Orden: fiscal → registering → printing (QR necesita shortCode del backend).
 */
export async function processKioskOrder(
  params: ProcessKioskOrderParams,
  onPhase: (phase: OrderProcessingPhase) => void,
): Promise<ProcessKioskOrderResult> {
  const phaseDelayMs = getDemoProcessingPhaseDelayMs();
  let displayOrderNumber = buildProvisionalOrderNumber();
  let trackShortCode: string | null = null;
  let orderRegisteredFromApi = false;
  let fiscalInvoiceNumber: number | undefined;

  const phases = buildProcessingPhases(params.declaresTaxes);

  for (const phase of phases) {
    onPhase(phase);

    if (phase === 'fiscal') {
      if (isKioskDemoMode && shouldEmitFiscalInvoice(params.declaresTaxes)) {
        const outcome = getDemoProcessingOutcome();
        if (outcome === 'fiscal_error') {
          return { status: 'fiscal_error', orderId: displayOrderNumber };
        }
      }

      if (shouldEmitFiscalInvoice(params.declaresTaxes)) {
        try {
          const fiscalResult = await emitOrderFiscalInvoice({
            lines: params.lines,
            customerDocumentId: params.customerDocumentId ?? '',
            customerName: params.customerName ?? '',
            customerAddress: params.customerAddress,
            paymentMethodId: params.paymentMethodId,
            cardPayment: params.cardPayment,
            primaryCurrency: params.primaryCurrency,
            usdToVesRate: params.usdToVesRate,
            declaresTaxes: params.declaresTaxes,
          });
          fiscalInvoiceNumber = fiscalResult?.issuedInvoiceNumber;
        } catch (error) {
          const message =
            error instanceof FiscalServiceError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Error al emitir la factura fiscal';
          if (__DEV__) {
            console.warn('[processKioskOrder] emitOrderFiscalInvoice failed', message);
          }
          return {
            status: 'fiscal_error',
            orderId: displayOrderNumber,
            fiscalInvoiceNumber,
          };
        }
      }
      if (phaseDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
      }
      continue;
    }

    if (phase === 'registering') {
      try {
        const token = await loadAccessToken();
        const client = createKioskApiClient(token ?? undefined);
        const request = mapCartToCreateOrderRequest({
          lines: params.lines,
          orderType: params.orderType,
          tableNumber: params.tableNumber,
          paymentMethodId: params.paymentMethodId,
          customerId: params.customerId,
          mobilePayment: params.mobilePayment,
          cardPayment: params.cardPayment,
          declaresTaxes: params.declaresTaxes,
          reservationId: params.reservationId,
        });
        const response = await client.createOrder(request);
        displayOrderNumber = response.displayOrderNumber;
        // UPDATE-14: QR solo con shortCode real. Efectivo / sin cocina → shortCode null → sin QR.
        const fromShortCode = response.shortCode?.trim() || null;
        const isCashPayment = params.paymentMethodId === 'cash';
        trackShortCode = isCashPayment || !fromShortCode ? null : fromShortCode;
        orderRegisteredFromApi = true;
        if (__DEV__) {
          console.info(
            '[processKioskOrder] order registered',
            `displayOrderNumber=${displayOrderNumber}`,
            `paymentMethod=${params.paymentMethodId ?? 'none'}`,
            fromShortCode ? `shortCode=${fromShortCode}` : 'shortCode=null',
            trackShortCode ? 'QR=enabled' : 'QR=omitido',
          );
        }
        params.onOrderRegistered?.(
          response.displayOrderNumber,
          response.grandTotalVES,
          response.grandTotalCurrency,
          response.currencyCode,
        );
      } catch (error) {
        if (isReservationExpiredError(error)) {
          params.onReservationExpired?.();
          return { status: 'reservation_expired' };
        }
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (__DEV__) {
          console.warn('[processKioskOrder] createOrder failed', errorMessage);
        }
        if (!shouldUseMockApi()) {
          if (params.cardPayment?.posReference) {
            return {
              status: 'order_registration_failed',
              posReference: params.cardPayment.posReference,
              fiscalInvoiceNumber,
            };
          }
          if (params.mobilePayment?.reference) {
            return {
              status: 'order_registration_failed',
              mobileReference: params.mobilePayment.reference,
              fiscalInvoiceNumber,
            };
          }
          return { status: 'failed' };
        }
      }
      if (phaseDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
      }
      continue;
    }

    if (phase === 'printing') {
      try {
        const shouldPrintQr =
          Boolean(params.printQrEnabled) &&
          params.paymentMethodId !== 'cash' &&
          Boolean(trackShortCode);
        await printOrderTicket({
          displayOrderNumber,
          lines: params.lines,
          totals: params.totals,
          usdToVesRate: params.usdToVesRate,
          primaryCurrency: params.primaryCurrency,
          orderType: params.orderType,
          tableNumber: params.tableNumber,
          organizationName: params.organizationName,
          organizationLegalName: params.organizationLegalName,
          printQrEnabled: shouldPrintQr,
          trackShortCode: shouldPrintQr ? trackShortCode : null,
          declaresTaxes: params.declaresTaxes,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[Printer] printOrderTicket failed', error);
        }
        const message =
          error instanceof OrderPrintError
            ? error.message
            : 'Error al imprimir el ticket';
        if (__DEV__) {
          console.warn(message);
        }
        return {
          status: 'fiscal_error',
          orderId: displayOrderNumber,
          fiscalInvoiceNumber,
        };
      }
      if (phaseDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
      }
      continue;
    }
  }

  if (isKioskDemoMode) {
    const outcome = getDemoProcessingOutcome();
    if (outcome === 'failed') {
      return { status: 'failed' };
    }
  }

  if (!shouldUseMockApi() && !orderRegisteredFromApi) {
    return { status: 'failed' };
  }

  return { status: 'ok', orderId: displayOrderNumber, fiscalInvoiceNumber };
}
