/** Public web base for order tracking QR (UPDATE-13 · QA). */
const ORDER_TRACK_BASE_URL = 'https://midazqa.dis-global.com/track';

/**
 * URL de tracking para QR en pantalla P15 y ticket impreso.
 * @param trackCode — `shortCode` de comanda del create-order response.
 */
export function buildDigitalTicketQrValue(trackCode: string): string {
  return `${ORDER_TRACK_BASE_URL}/${encodeURIComponent(trackCode)}`;
}
