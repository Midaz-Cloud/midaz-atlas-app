import { getKioskApiUrl } from '@shared/config/api';

import { parseKioskApiError } from '../errors';
import { buildCreateCustomerRequestFromForm } from '../mappers/createCustomer';
import {
  isOrgCustomerLookupResponse,
  mapOrgCustomerToKioskCustomer,
} from '../mappers/lookupCedula';
import { loadAccessToken } from '../tokenStorage';
import { fetchWithTimeout, KIOSK_TIMEOUTS } from './fetchWithTimeout';
import type { KioskCustomer } from '@shared/customer';

export type CreateCustomerLiveResult =
  | { status: 'ok'; customer: KioskCustomer }
  /** `networkError`: no hubo respuesta del servidor (sin red / timeout), no un rechazo. */
  | { status: 'error'; message: string; networkError?: true };

export async function createCustomerLive(params: {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<CreateCustomerLiveResult> {
  const accessToken = await loadAccessToken();
  if (!accessToken) {
    return {
      status: 'error',
      message: 'Sesión del kiosco no iniciada. Reinicie la aplicación.',
    };
  }

  const body = buildCreateCustomerRequestFromForm(params);
  const url = getKioskApiUrl('/kiosk/customers');

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }, KIOSK_TIMEOUTS.customers, '/kiosk/customers');
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Error de red al crear el cliente';
    return { status: 'error', message, networkError: true };
  }

  if (!response.ok) {
    const error = await parseKioskApiError(response);
    return { status: 'error', message: error.message };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    return { status: 'error', message: 'Respuesta inválida al crear el cliente' };
  }

  if (!isOrgCustomerLookupResponse(responseBody)) {
    return {
      status: 'error',
      message: 'El servidor no devolvió un cliente válido',
    };
  }

  return {
    status: 'ok',
    customer: mapOrgCustomerToKioskCustomer(responseBody),
  };
}
