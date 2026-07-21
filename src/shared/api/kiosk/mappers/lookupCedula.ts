import type { KioskCustomer } from '@shared/customer';
import { parseVenezuelaPhone } from '@shared/phone';

import type {
  CedulaLookupCneApi,
  CedulaLookupOrgCustomerApi,
  CustomerRegisterPrefill,
} from '../types/customerLookup';
import { composeDocumentId, parseDocumentId } from '../utils/documentId';

function joinNameParts(...parts: (string | undefined | null)[]): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
}

function titleCaseWord(word: string): string {
  if (!word) {
    return word;
  }
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Convierte nombres en MAYÚSCULAS del CNE a formato legible. */
export function formatCnePersonName(...parts: (string | undefined | null)[]): string {
  return joinNameParts(...parts)
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ');
}

function hasOrgCustomerId(body: Record<string, unknown>): boolean {
  const id = body.id;
  return typeof id === 'number' && Number.isFinite(id) && id > 0;
}

export function isOrgCustomerLookupResponse(
  body: unknown,
): body is CedulaLookupOrgCustomerApi {
  return (
    typeof body === 'object' &&
    body !== null &&
    hasOrgCustomerId(body as Record<string, unknown>)
  );
}

export function isCneLookupResponse(body: unknown): body is CedulaLookupCneApi {
  return (
    typeof body === 'object' &&
    body !== null &&
    'primer_nombre' in body &&
    'primer_apellido' in body &&
    !hasOrgCustomerId(body as Record<string, unknown>)
  );
}

function splitOrgCustomerDisplayName(
  name: string | undefined | null,
  billingName: string | undefined | null,
): { firstName: string; lastName: string } {
  const fullName = (name ?? '').trim();
  const surnames = (billingName ?? '').trim();
  if (surnames && fullName.endsWith(surnames)) {
    const givenNames = fullName.slice(0, fullName.length - surnames.length).trim();
    return {
      firstName: givenNames || fullName,
      lastName: surnames,
    };
  }
  if (surnames) {
    return { firstName: fullName, lastName: surnames };
  }
  return { firstName: fullName, lastName: '' };
}

export function mapOrgCustomerToKioskCustomer(api: CedulaLookupOrgCustomerApi): KioskCustomer {
  const type = api.typeIdentification.trim().toUpperCase();
  const number = String(api.identificationNumber).replace(/\D/g, '');
  const documentId = composeDocumentId(
    type === 'V' || type === 'E' || type === 'J' ? type : 'V',
    number,
  );

  const { firstName, lastName } =
    type === 'J'
      ? { firstName: (api.name ?? '').trim(), lastName: '' }
      : splitOrgCustomerDisplayName(api.name, api.billingName);

  return {
    id: api.id,
    documentId,
    firstName,
    lastName,
    phone: api.phoneNumber?.trim() ?? '',
    email: api.email?.trim().toLowerCase() ?? '',
  };
}

export function mapCneToRegisterPrefill(api: CedulaLookupCneApi): CustomerRegisterPrefill {
  return {
    firstName: formatCnePersonName(api.primer_nombre, api.segundo_nombre),
    lastName: formatCnePersonName(api.primer_apellido, api.segundo_apellido),
  };
}

export function mapOrgCustomerToRegisterPrefill(
  api: CedulaLookupOrgCustomerApi,
): CustomerRegisterPrefill {
  const type = api.typeIdentification.trim().toUpperCase();
  const customer = mapOrgCustomerToKioskCustomer(api);
  const prefill: CustomerRegisterPrefill = {
    firstName: customer.firstName,
    lastName: type === 'J' ? '' : customer.lastName,
  };
  if (customer.phone) {
    prefill.phone = customer.phone;
  }
  if (customer.email) {
    prefill.email = customer.email;
  }
  return prefill;
}

export function splitRegisterPrefillPhone(prefill: CustomerRegisterPrefill): {
  operatorCode: ReturnType<typeof parseVenezuelaPhone>['operatorCode'];
  subscriberNumber: string;
} | null {
  if (!prefill.phone?.trim()) {
    return null;
  }
  const parsed = parseVenezuelaPhone(prefill.phone);
  return {
    operatorCode: parsed.operatorCode,
    subscriberNumber: parsed.subscriberNumber,
  };
}

export function lookupPrefillDisplayName(prefill: CustomerRegisterPrefill): string {
  return joinNameParts(prefill.firstName, prefill.lastName);
}

export function documentIdToLookupQuery(documentId: string): {
  nacionalidad: string;
  cedula: string;
} {
  const { type, number } = parseDocumentId(documentId);
  return { nacionalidad: type, cedula: number };
}
