import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  createKioskApiClient,
  KioskApiError,
  mapCartToCreateOrderRequest,
  loadAccessToken,
} from '@shared/api/kiosk';
import type { FulfillmentType } from '@shared/api/kiosk';
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
  /**
   * Fulfillment de la opción de tipo de pedido que eligió el cliente. Manda sobre
   * `orderType`, que solo distingue dineIn/takeOut y no alcanza desde que los tipos
   * se configuran por panel (dos opciones pueden mapear al mismo par legado).
   */
  fulfillment?: FulfillmentType;
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
  /** Same source as Z close (`organization.effectiveInvoicingType`). */
  effectiveInvoicingType?: string | null;
  reservationId?: string | null;
  /**
   * Customer fiscal retry: do not short-circuit demo `fiscal_error`.
   * Payment already succeeded; retry must actually emit (mock or HkaApp).
   */
  skipSimulatedFiscalError?: boolean;
  /**
   * Midaz order already created — skip POST /kiosk/orders (no duplicate).
   * There is no kiosk API to PATCH fiscalInvoiceNumber.
   */
  existingRegisteredOrder?: {
    displayOrderNumber: string;
    shortCode?: string | null;
  };
  onOrderRegistered?: (
    displayOrderNumber: string,
    grandTotalVES: number,
    grandTotalCurrency: number,
    currencyCode: string,
  ) => void;
  onReservationExpired?: () => void;
};

function orderShouldEmitFiscalInvoice(
  params: Pick<
    ProcessKioskOrderParams,
    'declaresTaxes' | 'paymentMethodId' | 'effectiveInvoicingType'
  >,
): boolean {
  return shouldEmitFiscalInvoice(
    params.declaresTaxes,
    params.paymentMethodId,
    params.effectiveInvoicingType,
  );
}

function buildProcessingPhases(
  params: Pick<
    ProcessKioskOrderParams,
    'declaresTaxes' | 'paymentMethodId' | 'effectiveInvoicingType'
  >,
): OrderProcessingPhase[] {
  const phases: OrderProcessingPhase[] = [];
  if (orderShouldEmitFiscalInvoice(params)) {
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
  let orderShortCode: string | null = null;
  let orderRegisteredFromApi = false;
  let fiscalInvoiceNumber: number | undefined;

  const phases = buildProcessingPhases(params);

  for (const phase of phases) {
    onPhase(phase);

    if (phase === 'fiscal') {
      if (
        isKioskDemoMode &&
        !params.skipSimulatedFiscalError &&
        orderShouldEmitFiscalInvoice(params)
      ) {
        const outcome = getDemoProcessingOutcome();
        if (outcome === 'fiscal_error') {
          return { status: 'fiscal_error', orderId: displayOrderNumber };
        }
      }

      if (orderShouldEmitFiscalInvoice(params)) {
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
            effectiveInvoicingType: params.effectiveInvoicingType,
          });
          fiscalInvoiceNumber = fiscalResult?.issuedInvoiceNumber;
        } catch (error) {
          const message =
            error instanceof FiscalServiceError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Error al emitir la factura fiscal';
          console.warn('[processKioskOrder] emitOrderFiscalInvoice failed', message);
          return {
            status: 'fiscal_error',
            orderId: displayOrderNumber,
            fiscalInvoiceNumber,
            message,
          };
        }
      }
      if (phaseDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
      }
      continue;
    }

    if (phase === 'registering') {
      if (params.existingRegisteredOrder?.displayOrderNumber) {
        displayOrderNumber = params.existingRegisteredOrder.displayOrderNumber;
        const fromShortCode =
          params.existingRegisteredOrder.shortCode?.trim() || null;
        orderShortCode = fromShortCode;
        const isCashPayment = params.paymentMethodId === 'cash';
        trackShortCode = isCashPayment || !fromShortCode ? null : fromShortCode;
        orderRegisteredFromApi = true;
        if (phaseDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
        }
        continue;
      }

      try {
        const token = await loadAccessToken();
        const client = createKioskApiClient(token ?? undefined);
        const request = mapCartToCreateOrderRequest({
          lines: params.lines,
          orderType: params.orderType,
          fulfillment: params.fulfillment,
          tableNumber: params.tableNumber,
          paymentMethodId: params.paymentMethodId,
          customerId: params.customerId,
          mobilePayment: params.mobilePayment,
          cardPayment: params.cardPayment,
          declaresTaxes: params.declaresTaxes,
          reservationId: params.reservationId,
          fiscalInvoiceNumber,
        });
        const response = await client.createOrder(request);
        displayOrderNumber = response.displayOrderNumber;
        // UPDATE-14: QR solo con shortCode real. Efectivo / sin cocina → shortCode null → sin QR.
        const fromShortCode = response.shortCode?.trim() || null;
        orderShortCode = fromShortCode;
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
        const rawJson =
          error instanceof KioskApiError && error.body != null
            ? JSON.stringify(error.body)
            : undefined;
        if (__DEV__) {
          console.warn('[processKioskOrder] createOrder failed', errorMessage);
        }
        if (!shouldUseMockApi()) {
          if (params.cardPayment?.posReference) {
            return {
              status: 'order_registration_failed',
              posReference: params.cardPayment.posReference,
              fiscalInvoiceNumber,
              message: errorMessage,
              rawJson,
            };
          }
          if (params.mobilePayment?.reference) {
            return {
              status: 'order_registration_failed',
              mobileReference: params.mobilePayment.reference,
              fiscalInvoiceNumber,
              message: errorMessage,
              rawJson,
            };
          }
          return { status: 'failed', message: errorMessage, rawJson, fiscalInvoiceNumber };
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
            : 'No se pudo imprimir el ticket de cliente';
        if (__DEV__) {
          console.warn(message);
        }
        // Customer ticket (I0Z) is best-effort after fiscal + order exist.
        // Do not map USB/print failures to fiscal_error (HkaApp).
        return {
          status: 'ticket_print_failed',
          orderId: displayOrderNumber,
          shortCode: orderShortCode,
          fiscalInvoiceNumber,
          message,
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
