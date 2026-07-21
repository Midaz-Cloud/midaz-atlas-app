import type { OrderSuccessDisplayMode } from './types';

/** P14 número vs P15 QR según `printQrEnabled` en GET /kiosk/config (UPDATE-8). */
export function resolveOrderSuccessDisplayMode(
  printQrEnabled: boolean,
): OrderSuccessDisplayMode {
  return printQrEnabled ? 'qr' : 'number';
}
