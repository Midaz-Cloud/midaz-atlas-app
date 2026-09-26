import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';

import {
  KioskApiError,
  mapCartToCreateOrderRequest,
  withKioskAuth,
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
import { isKioskOffline, markKioskOffline } from '@shared/connectivity';
import type { KioskCustomer } from '@shared/customer';

import { registerOrderLocally } from './registerOrderLocally';

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
  /** Cliente de facturación completo: sin id (registrado sin red) viaja como snapshot. */
  customer?: KioskCustomer | null;
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
   * uuid de la venta (uno por pedido). Hace idempotente POST /kiosk/orders: un
   * reintento devuelve la orden ya creada en vez de otra con otra factura.
   */
  clientOrderId?: string;
  /** Serial del kiosko: arma el número local (K040-0042) si hay que registrar sin backend. */
  deviceSerial?: string | null;
  /**
   * La venta se hizo sin backend (sesión offline): se registra directo en el kiosko
   * sin intentar POST /kiosk/orders. Default: estado actual de conectividad.
   */
  offlineMode?: boolean;
  /** ISO: hora del cobro aprobado. Default: inicio del procesamiento (segundos después). */
  paidAt?: string;
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

/** Sin respuesta útil del backend (red, 5xx, 429): la venta se reintenta al sincronizar. */
function isTransientRegisterError(error: KioskApiError): boolean {
  return error.statusCode >= 500 || error.statusCode === 429 || error.statusCode === 408;
}

export const OFFLINE_TICKET_FOOTER_NOTE =
  'Pedido registrado sin conexion. Se enviara al sistema al volver la red.';

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
  let orderRegistered = false;
  let registeredLocally = false;
  let fiscalInvoiceNumber: number | undefined;
  const saleClosedAt = params.paidAt ?? new Date().toISOString();

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
        orderRegistered = true;
        if (phaseDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, phaseDelayMs));
        }
        continue;
      }

      const mapped = mapCartToCreateOrderRequest({
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
      const request = params.clientOrderId
        ? { ...mapped, clientOrderId: params.clientOrderId }
        : mapped;

      /**
       * El dinero ya se cobró: si el backend no la registra, la venta queda en el
       * kiosko (outbox + comanda LAN) y se entrega igual. Nunca vuelve a cobrar ni
       * a emitir la factura. Devuelve un resultado solo si ni eso se pudo.
       */
      const registerLocallyOrFail = async (
        origin: 'offline' | 'register_failed',
        cause?: unknown,
      ): Promise<ProcessKioskOrderResult | null> => {
        const clientOrderId = params.clientOrderId;
        const deviceSerial = params.deviceSerial;
        const errorMessage =
          cause instanceof Error ? cause.message : cause != null ? String(cause) : undefined;
        const rawJson =
          cause instanceof KioskApiError && cause.body != null
            ? JSON.stringify(cause.body)
            : undefined;
        if (!clientOrderId || !deviceSerial) {
          return { status: 'failed', message: errorMessage, rawJson, fiscalInvoiceNumber };
        }
        const rejected =
          cause instanceof KioskApiError && !isTransientRegisterError(cause)
            ? { error: cause.message, httpStatus: cause.statusCode }
            : undefined;
        try {
          const local = await registerOrderLocally({
            request,
            clientOrderId,
            deviceSerial,
            lines: params.lines,
            paidAt: saleClosedAt,
            exchangeRate: params.usdToVesRate,
            grandTotalVES: params.totals.totalVes,
            customer: params.customer,
            customerName: params.customerName,
            origin,
            ticket: {
              displayOrderNumber,
              lines: params.lines,
              totals: params.totals,
              usdToVesRate: params.usdToVesRate,
              primaryCurrency: params.primaryCurrency,
              orderType: params.orderType,
              tableNumber: params.tableNumber,
              organizationName: params.organizationName,
              organizationLegalName: params.organizationLegalName,
              declaresTaxes: params.declaresTaxes,
            },
            fiscalInvoiceNumber,
            posReference: params.cardPayment?.posReference ?? null,
            rejected,
          });
          displayOrderNumber = local.localNumber;
          orderShortCode = null;
          trackShortCode = null;
          orderRegistered = true;
          registeredLocally = true;
          if (origin === 'register_failed' && !rejected) {
            markKioskOffline(errorMessage ?? 'createOrder failed');
          }
          params.onOrderRegistered?.(
            local.localNumber,
            params.totals.totalVes,
            params.totals.totalUsd,
            params.primaryCurrency ?? 'USD',
          );
          if (__DEV__) {
            console.info(
              '[processKioskOrder] order registered locally',
              `localNumber=${local.localNumber}`,
              `origin=${origin}`,
              rejected ? `rejected=${rejected.httpStatus}` : 'queued',
            );
          }
          return null;
        } catch (localError) {
          console.warn('[processKioskOrder] registerOrderLocally failed', localError);
          return {
            status: 'failed',
            message: errorMessage ?? 'No se pudo guardar la venta en el kiosco',
            rawJson,
            fiscalInvoiceNumber,
          };
        }
      };

      const offlineMode = params.offlineMode ?? isKioskOffline();
      if (offlineMode && !shouldUseMockApi()) {
        const failure = await registerLocallyOrFail('offline');
        if (failure) {
          return failure;
        }
      } else {
        try {
          let response;
          try {
            response = await withKioskAuth((client) =>
              client.createOrder(request, { idempotencyKey: params.clientOrderId }),
            );
          } catch (error) {
            if (!isReservationExpiredError(error) || !request.reservationId) {
              throw error;
            }
            // Ya se cobró: la reserva vencida no puede tumbar la venta. Sin ella el
            // backend valida stock en vivo (mismo clientOrderId → sin duplicado).
            params.onReservationExpired?.();
            const withoutReservation = { ...request };
            delete withoutReservation.reservationId;
            response = await withKioskAuth((client) =>
              client.createOrder(withoutReservation, { idempotencyKey: params.clientOrderId }),
            );
          }
          displayOrderNumber = response.displayOrderNumber;
          // UPDATE-14: QR solo con shortCode real. Efectivo / sin cocina → shortCode null → sin QR.
          const fromShortCode = response.shortCode?.trim() || null;
          orderShortCode = fromShortCode;
          const isCashPayment = params.paymentMethodId === 'cash';
          trackShortCode = isCashPayment || !fromShortCode ? null : fromShortCode;
          orderRegistered = true;
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
          if (__DEV__) {
            console.warn(
              '[processKioskOrder] createOrder failed',
              error instanceof Error ? error.message : String(error),
            );
          }
          if (!shouldUseMockApi()) {
            const failure = await registerLocallyOrFail('register_failed', error);
            if (failure) {
              return failure;
            }
          }
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
          footerNote: registeredLocally ? OFFLINE_TICKET_FOOTER_NOTE : undefined,
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
          ...(registeredLocally ? { registeredLocally: true as const } : {}),
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

  if (!shouldUseMockApi() && !orderRegistered) {
    return { status: 'failed' };
  }

  return {
    status: 'ok',
    orderId: displayOrderNumber,
    fiscalInvoiceNumber,
    ...(registeredLocally ? { registeredLocally: true as const } : {}),
  };
}
