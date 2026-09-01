import { createPrinterClient } from './createPrinterClient';
import { buildDigitalTicketQrValue } from '@shared/kiosk-order/buildDigitalTicketQrValue';
import { formatOrderTicketText, type FormatOrderTicketParams } from './formatOrderTicketText';
import { resolveTicketOrganizationName } from './resolveTicketOrganizationName';

export type PrintOrderTicketParams = FormatOrderTicketParams & {
  printQrEnabled?: boolean;
  /** Comanda shortCode from POST /kiosk/orders — required for tracking QR. */
  trackShortCode?: string | null;
};

export const NO_USB_PRINTER_CODE = 'NO_USB_DEVICE';

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export class OrderPrintError extends Error {
  readonly code?: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message);
    this.name = 'OrderPrintError';
    this.code = options?.code;
    if (options?.cause instanceof Error) {
      this.cause = options.cause;
    }
  }
}

export function isMissingUsbPrinterError(error: unknown): boolean {
  if (error instanceof OrderPrintError) {
    return error.code === NO_USB_PRINTER_CODE;
  }
  return getErrorCode(error) === NO_USB_PRINTER_CODE;
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
    const code = getErrorCode(error);
    const message =
      error instanceof Error ? error.message : 'No se pudo imprimir el ticket del pedido';
    if (__DEV__ && code === NO_USB_PRINTER_CODE) {
      console.warn('[Printer] No USB printer; skipping ticket print');
    }
    throw new OrderPrintError(message, { cause: error, code });
  } finally {
    try {
      await client.disconnect();
    } catch {
      // Ignore disconnect errors after print failure
    }
  }
}
