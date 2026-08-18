import { getKioskApiUrl } from '@shared/config/api';

import { parseKioskApiError } from '../errors';
import { buildUpdateCustomerRequestFromForm } from '../mappers/createCustomer';
import {
  isOrgCustomerLookupResponse,
  mapOrgCustomerToKioskCustomer,
} from '../mappers/lookupCedula';
import { loadAccessToken } from '../tokenStorage';
import type { KioskCustomer } from '@shared/customer';

export type UpdateCustomerLiveResult =
  | { status: 'ok'; customer: KioskCustomer }
  | { status: 'error'; message: string };

export async function updateCustomerLive(params: {
  customerId: number;
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<UpdateCustomerLiveResult> {
  const accessToken = await loadAccessToken();
  if (!accessToken) {
    return {
      status: 'error',
      message: 'Sesión del kiosco no iniciada. Reinicie la aplicación.',
    };
  }

  const body = buildUpdateCustomerRequestFromForm(params);
  const url = getKioskApiUrl(`/kiosk/customers/${params.customerId}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Error de red al actualizar el cliente';
    return { status: 'error', message };
  }

  if (!response.ok) {
    const error = await parseKioskApiError(response);
    return { status: 'error', message: error.message };
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    return { status: 'error', message: 'Respuesta inválida al actualizar el cliente' };
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
