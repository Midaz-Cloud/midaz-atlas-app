import { reportKioskNetworkFailure, reportKioskNetworkSuccess } from '@shared/connectivity/kioskConnectivityStore';

import { KioskNetworkError } from '../errors';

/** Presupuestos por tipo de llamada (ms). Sin timeout, un gateway colgado dejaba al cliente esperando indefinidamente. */
export const KIOSK_TIMEOUTS = {
  login: 8_000,
  config: 12_000,
  products: 12_000,
  reserve: 8_000,
  createOrder: 15_000,
  validatePayment: 15_000,
  customers: 10_000,
  customerLookup: 6_000,
  settlement: 15_000,
  banks: 8_000,
  default: 10_000,
} as const;

/**
 * fetch con AbortController. Cualquier falla sin respuesta HTTP se convierte en
 * KioskNetworkError y se reporta al store de conectividad; una respuesta (aunque
 * sea 4xx/5xx) cuenta como "hay red".
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  path: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    reportKioskNetworkSuccess();
    return response;
  } catch (error) {
    const aborted = (error as { name?: string })?.name === 'AbortError';
    const networkError = new KioskNetworkError(aborted ? 'timeout' : 'network', path, error);
    reportKioskNetworkFailure(path);
    throw networkError;
  } finally {
    clearTimeout(timer);
  }
}
