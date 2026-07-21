import { createPrinterClient } from './createPrinterClient';
import { buildDigitalTicketQrValue } from '@shared/kiosk-order/buildDigitalTicketQrValue';
import { formatOrderTicketText, type FormatOrderTicketParams } from './formatOrderTicketText';
import { resolveTicketOrganizationName } from './resolveTicketOrganizationName';

export type PrintOrderTicketParams = FormatOrderTicketParams & {
  printQrEnabled?: boolean;
  /** Comanda shortCode from POST /kiosk/orders — required for tracking QR. */
  trackShortCode?: string | null;
};

export class OrderPrintError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'OrderPrintError';
    if (options?.cause instanceof Error) {
      this.cause = options.cause;
    }
  }
}

export async function printOrderTicket(params: PrintOrderTicketParams): Promise<void> {
  const client = createPrinterClient();
  const body = formatOrderTicketText(params);
  const merchantName = resolveTicketOrganizationName(
    params.organizationName,
    params.organizationLegalName,
  );
  const trackCode = params.trackShortCode?.trim();
  const shouldPrintQr = Boolean(params.printQrEnabled && trackCode);
  const qrValue = shouldPrintQr ? buildDigitalTicketQrValue(trackCode!) : undefined;

  if (__DEV__) {
    console.info(
      '[Printer] printOrderTicket',
      `printQrEnabled=${Boolean(params.printQrEnabled)}`,
      trackCode ? `shortCode=${trackCode}` : 'shortCode=null',
      qrValue ? `QR=${qrValue}` : 'QR=omitido',
    );
  }

  try {
    await client.connect();
    await client.printText(body, merchantName, qrValue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo imprimir el ticket del pedido';
    throw new OrderPrintError(message, { cause: error });
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors after print failure
    }
  }
}
