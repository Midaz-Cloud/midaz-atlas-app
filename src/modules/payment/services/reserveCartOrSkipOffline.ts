import { KioskApiError, isKioskNetworkError } from '@shared/api/kiosk';
import { shouldUseMockApi } from '@shared/config/api';
import { isKioskOffline, markKioskOffline } from '@shared/connectivity';
import type { CartLine } from '@shared/kiosk-order/types';

import {
  reserveCartBeforePayment,
  type ServerLinePrice,
  type ReserveCartBeforePaymentResult,
} from './reserveCartBeforePayment';

export type ReserveCartOrSkipResult =
  | (Extract<ReserveCartBeforePaymentResult, { ok: true }> & { offline?: false })
  | { ok: true; reservationId: null; serverPrices: ServerLinePrice[]; offline: true }
  | Extract<ReserveCartBeforePaymentResult, { ok: false }>;

function isBackendDown(error: unknown): boolean {
  return (
    isKioskNetworkError(error) ||
    (error instanceof KioskApiError && (error.statusCode >= 500 || error.statusCode === 429))
  );
}

/**
 * La reserva de stock protege contra vender lo que no hay, pero sin backend no
 * puede bloquear la venta: se cobra con el catálogo cacheado y el backend descuenta
 * el stock (forzado) al sincronizar. Un rechazo real (4xx) se propaga como siempre.
 */
export async function reserveCartOrSkipOffline(lines: CartLine[]): Promise<ReserveCartOrSkipResult> {
  const skip = { ok: true as const, reservationId: null, serverPrices: [], offline: true as const };
  if (!shouldUseMockApi() && isKioskOffline()) {
    return skip;
  }
  try {
    return await reserveCartBeforePayment(lines);
  } catch (error) {
    if (!shouldUseMockApi() && isBackendDown(error)) {
      markKioskOffline(error instanceof Error ? error.message : 'reserve failed');
      return skip;
    }
    throw error;
  }
}
