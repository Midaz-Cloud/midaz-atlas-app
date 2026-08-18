import { getKioskTrackBaseUrl } from '@shared/config/api';

/**
 * URL de tracking para QR en pantalla P15 y ticket impreso.
 * `{KIOSK_TRACK_BASE_URL}/track/{shortCode}` — origin only, no trailing slash.
 * @param trackCode — `shortCode` de comanda del create-order response.
 */
export function buildDigitalTicketQrValue(trackCode: string): string {
  return `${getKioskTrackBaseUrl()}/track/${encodeURIComponent(trackCode)}`;
}
