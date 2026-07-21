import { shouldUseMockFiscal } from '@shared/config/fiscal';

import { checkFiscalHealth } from './checkFiscalHealth';
import { emitFiscalInvoice } from './emitFiscalInvoice';
import { FiscalServiceError } from './FiscalServiceError';
import type { MapOrderToFiscalInvoiceParams } from './mapOrderToFiscalInvoiceRequest';
import {
  mapOrderToFiscalInvoiceRequest,
  shouldEmitFiscalInvoice,
} from './mapOrderToFiscalInvoiceRequest';

export type EmitOrderFiscalInvoiceResult = {
  issuedInvoiceNumber: number;
  traceLog?: string;
};

export type EmitOrderFiscalInvoiceError = {
  message: string;
  httpStatus?: number;
};

export async function emitOrderFiscalInvoice(
  params: MapOrderToFiscalInvoiceParams,
): Promise<EmitOrderFiscalInvoiceResult | null> {
  if (!shouldEmitFiscalInvoice(params.declaresTaxes)) {
    return null;
  }

  const request = mapOrderToFiscalInvoiceRequest(params);
  if (!request) {
    throw new FiscalServiceError(
      'No se pudo preparar la factura fiscal: faltan datos del cliente o lineas validas.',
    );
  }

  if (!shouldUseMockFiscal()) {
    const health = await checkFiscalHealth({ probeEnq: true });
    if (!health.data?.healthy) {
      throw new FiscalServiceError(
        health.message ??
          health.error ??
          'Servicio fiscal o impresora no disponibles. Abra HkaApp y verifique USB.',
        503,
      );
    }
  }

  if (__DEV__) {
    console.log('[Fiscal] emitOrderFiscalInvoice request', request);
  }

  const envelope = await emitFiscalInvoice(request);
  const issuedInvoiceNumber = envelope.data?.issuedInvoiceNumber;

  if (!envelope.success || issuedInvoiceNumber == null || issuedInvoiceNumber <= 0) {
    throw new FiscalServiceError(
      envelope.error ??
        envelope.message ??
        'La impresora fiscal rechazo la emision de la factura.',
    );
  }

  if (__DEV__) {
    console.log('[Fiscal] emitOrderFiscalInvoice response', envelope);
  }

  return {
    issuedInvoiceNumber,
    traceLog: envelope.data?.traceLog,
  };
}
