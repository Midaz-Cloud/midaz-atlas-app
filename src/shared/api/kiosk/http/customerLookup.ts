import { getKioskApiKey, getKioskApiUrl } from '@shared/config/api';
import { getKioskDeviceProfile } from '@shared/device';

import { KioskApiError, parseKioskApiError } from '../errors';
import type { KioskCustomer } from '@shared/customer';

import {
  documentIdToLookupQuery,
  isCneLookupResponse,
  isOrgCustomerLookupResponse,
  mapCneToRegisterPrefill,
  mapOrgCustomerToKioskCustomer,
} from '../mappers/lookupCedula';
import type { CustomerRegisterPrefill } from '../types/customerLookup';

export type LiveLookupCedulaResult =
  | { status: 'found'; customer: KioskCustomer; source: 'org' }
  | {
      status: 'register';
      documentId: string;
      prefill: CustomerRegisterPrefill;
      source: 'cne';
    }
  | { status: 'not_found'; documentId: string }
  | { status: 'error'; message: string; documentId: string };

export async function lookupCustomerByCedulaLive(
  documentId: string,
): Promise<LiveLookupCedulaResult> {
  const apiKey = getKioskApiKey();
  if (!apiKey) {
    return {
      status: 'error',
      message: 'Falta KIOSK_API_KEY en la configuración',
      documentId,
    };
  }

  const device = await getKioskDeviceProfile();
  const { nacionalidad, cedula } = documentIdToLookupQuery(documentId);

  const query = new URLSearchParams({
    nacionalidad,
    cedula,
    apiKey,
    serialNumber: device.serialNumber,
  });

  const url = getKioskApiUrl(`/customers/lookup-cedula?${query.toString()}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Error de red al consultar la cédula';
    return { status: 'error', message, documentId };
  }

  if (response.status === 404) {
    return { status: 'not_found', documentId };
  }

  if (!response.ok) {
    const error = await parseKioskApiError(response);
    return { status: 'error', message: error.message, documentId };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      status: 'error',
      message: 'Respuesta inválida del servidor',
      documentId,
    };
  }

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
