import { normalizeVenezuelaPhone } from '@shared/phone';

import {
  KIOSK_CUSTOMER_DEFAULT_BILLING_ADDRESS,
  KIOSK_CUSTOMER_DEFAULT_BILLING_CITY,
  KIOSK_CUSTOMER_DEFAULT_BILLING_COUNTRY,
  KIOSK_CUSTOMER_DEFAULT_BILLING_STATE,
  KIOSK_CUSTOMER_DEFAULT_NOTES,
} from '../constants/customerDefaults';
import type { CreateCustomerRequestApi } from '../types/createCustomer';
import { parseDocumentId } from '../utils/documentId';

function joinCustomerNameParts(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' ');
}

/**
 * POST /kiosk/customers (mismo body que POST /customers):
 * - `name`: nombre completo (nombres + apellidos) — es lo que muestra la org.
 * - `billingName`: apellidos (nombre fiscal).
 */
export function buildCreateCustomerRequestFromForm(params: {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): CreateCustomerRequestApi {
  const { type, number } = parseDocumentId(params.documentId);
  const firstName = (params.firstName ?? '').trim();
  const lastName = (params.lastName ?? '').trim();
  const email = params.email?.trim().toLowerCase() ?? '';
  const phoneNumber = normalizeVenezuelaPhone(params.phone);

  const isJuridico = type === 'J';

  const request: CreateCustomerRequestApi = {
    typeIdentification: type,
    identificationNumber: number,
    name: isJuridico ? firstName : joinCustomerNameParts(firstName, lastName),
    billingName: isJuridico ? '' : lastName,
    billingAddressLine1: KIOSK_CUSTOMER_DEFAULT_BILLING_ADDRESS,
    billingCity: KIOSK_CUSTOMER_DEFAULT_BILLING_CITY,
    billingState: KIOSK_CUSTOMER_DEFAULT_BILLING_STATE,
    billingCountry: KIOSK_CUSTOMER_DEFAULT_BILLING_COUNTRY,
    contactPerson: '',
    notes: KIOSK_CUSTOMER_DEFAULT_NOTES,
  };

  if (email) {
    request.email = email;
  }
  if (phoneNumber) {
    request.phoneNumber = phoneNumber;
  }

  return request;
}
