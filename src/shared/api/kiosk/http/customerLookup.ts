import { getKioskApiKey, getKioskApiUrl } from '@shared/config/api';
import { getKioskDeviceProfile } from '@shared/device';

import { KioskApiError, isKioskNetworkError, parseKioskApiError } from '../errors';
import type { KioskCustomer } from '@shared/customer';

import {
  documentIdToLookupQuery,
  isCneLookupResponse,
  isOrgCustomerLookupResponse,
  mapCneToRegisterPrefill,
  mapOrgCustomerToKioskCustomer,
} from '../mappers/lookupCedula';
import type { CustomerRegisterPrefill } from '../types/customerLookup';
import { withKioskAuth } from '../withKioskAuth';
import { fetchWithTimeout, KIOSK_TIMEOUTS } from './fetchWithTimeout';

export type LiveLookupCedulaResult =
  | { status: 'found'; customer: KioskCustomer; source: 'org' }
  | {
      status: 'register';
      documentId: string;
      prefill: CustomerRegisterPrefill;
      source: 'cne';
    }
  | { status: 'not_found'; documentId: string }
  /** `networkError`: no hubo respuesta del servidor (sin red / timeout), no un rechazo. */
  | { status: 'error'; message: string; documentId: string; networkError?: true };

/** El serial no cambia durante la vida del proceso: leerlo una vez (antes, 7 llamadas nativas por búsqueda). */
let cachedSerial: Promise<string> | null = null;
function getLookupSerial(): Promise<string> {
  if (!cachedSerial) {
    cachedSerial = getKioskDeviceProfile()
      .then((device) => device.serialNumber)
      .catch((error) => {
        cachedSerial = null;
        throw error;
      });
  }
  return cachedSerial;
}

type LookupOutcome =
  | { kind: 'body'; body: unknown }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string; networkError?: true };

/**
 * Un gateway sin la ruta autenticada responde 404 "Cannot GET /kiosk/customers/…"
 * (Nest); la cédula inexistente también es 404 pero con otro mensaje. Solo el
 * primero justifica caer a la ruta pública.
 */
function isMissingRouteError(error: KioskApiError): boolean {
  return error.statusCode === 404 && /cannot (get|post)/i.test(error.message);
}

/**
 * Preferida: `GET /kiosk/customers/lookup-cedula` con el token del kiosko. El
 * gateway identifica la org por el JWT, así que la API key deja de viajar en la
 * URL. Si el backend todavía no tiene esa ruta (despliegue por fases) se usa la
 * ruta pública de siempre.
 */
async function lookupViaKioskToken(nacionalidad: string, cedula: string): Promise<LookupOutcome | null> {
  try {
    const body = await withKioskAuth((client) => client.lookupCedula(nacionalidad, cedula));
    return { kind: 'body', body };
  } catch (error) {
    if (error instanceof KioskApiError) {
      if (isMissingRouteError(error)) {
        return null;
      }
      if (error.statusCode === 404) {
        return { kind: 'not_found' };
      }
      return { kind: 'error', message: error.message };
    }
    if (isKioskNetworkError(error)) {
      return { kind: 'error', message: error.message, networkError: true };
    }
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Error de red al consultar la cédula',
      networkError: true,
    };
  }
}

/** Ruta pública histórica (`apiKey` + `serialNumber` en la query). Respaldo. */
async function lookupViaPublicRoute(nacionalidad: string, cedula: string): Promise<LookupOutcome> {
  const apiKey = getKioskApiKey();
  if (!apiKey) {
    return { kind: 'error', message: 'Falta KIOSK_API_KEY en la configuración' };
  }
  const serialNumber = await getLookupSerial();
  const query = new URLSearchParams({ nacionalidad, cedula, apiKey, serialNumber });
  const url = getKioskApiUrl(`/customers/lookup-cedula?${query.toString()}`);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      { method: 'GET', headers: { Accept: 'application/json' } },
      KIOSK_TIMEOUTS.customerLookup,
      '/customers/lookup-cedula',
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Error de red al consultar la cédula';
    return { kind: 'error', message, networkError: true };
  }

  if (response.status === 404) {
    return { kind: 'not_found' };
  }
  if (!response.ok) {
    const error = await parseKioskApiError(response);
    return { kind: 'error', message: error.message };
  }
  try {
    return { kind: 'body', body: await response.json() };
  } catch {
    return { kind: 'error', message: 'Respuesta inválida del servidor' };
  }
}

export async function lookupCustomerByCedulaLive(
  documentId: string,
): Promise<LiveLookupCedulaResult> {
  const { nacionalidad, cedula } = documentIdToLookupQuery(documentId);

  const outcome =
    (await lookupViaKioskToken(nacionalidad, cedula)) ??
    (await lookupViaPublicRoute(nacionalidad, cedula));

  if (outcome.kind === 'not_found') {
    return { status: 'not_found', documentId };
  }
  if (outcome.kind === 'error') {
    return outcome.networkError
      ? { status: 'error', message: outcome.message, documentId, networkError: true }
      : { status: 'error', message: outcome.message, documentId };
  }

  const body = outcome.body;
  if (isOrgCustomerLookupResponse(body)) {
    return {
      status: 'found',
      customer: mapOrgCustomerToKioskCustomer(body),
      source: 'org',
    };
  }
  if (isCneLookupResponse(body)) {
    return {
      status: 'register',
      documentId,
      prefill: mapCneToRegisterPrefill(body),
      source: 'cne',
    };
  }
  return {
    status: 'error',
    message: 'Formato de respuesta no reconocido',
    documentId,
  };
}

/** Solo tests. */
export function __resetCustomerLookupForTests(): void {
  cachedSerial = null;
}
