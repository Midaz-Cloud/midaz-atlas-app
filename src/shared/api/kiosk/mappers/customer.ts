import type { KioskCustomer } from '@shared/customer';
import { normalizeVenezuelaPhone } from '@shared/phone';

import type { KioskCustomerApi, RegisterKioskCustomerRequest } from '../types';

export function mapApiCustomerToKioskCustomer(api: KioskCustomerApi): KioskCustomer {
  return {
    id: api.id,
    documentId: api.documentId,
    firstName: api.firstName,
    lastName: api.lastName,
    phone: api.phone,
    email: api.email,
  };
}

export function mapRegisterRequestToApi(params: {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): RegisterKioskCustomerRequest {
  return {
    documentId: params.documentId,
    firstName: (params.firstName ?? '').trim(),
    lastName: (params.lastName ?? '').trim(),
    phone: normalizeVenezuelaPhone(params.phone),
    email: params.email?.trim().toLowerCase() ?? '',
  };
}
