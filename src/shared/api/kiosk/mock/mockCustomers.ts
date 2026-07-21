import { normalizeVenezuelaPhone } from '@shared/phone';

import type { KioskCustomerApi, RegisterKioskCustomerRequest } from '../types';
import { normalizeDocumentId } from '../utils/documentId';

const seedCustomers: KioskCustomerApi[] = [
  {
    id: 1,
    documentId: 'V12345678',
    firstName: 'María',
    lastName: 'González',
    phone: '04141234567',
    email: 'maria.gonzalez@example.com',
  },
];

let nextCustomerId = 2;
const customersByDocument = new Map<string, KioskCustomerApi>();

for (const customer of seedCustomers) {
  customersByDocument.set(normalizeDocumentId(customer.documentId), { ...customer });
}

export function mockFindCustomerByDocument(documentId: string): KioskCustomerApi | undefined {
  return customersByDocument.get(normalizeDocumentId(documentId));
}

export function mockRegisterCustomer(
  request: RegisterKioskCustomerRequest,
): KioskCustomerApi {
  const documentId = normalizeDocumentId(request.documentId);
  const existing = customersByDocument.get(documentId);
  if (existing) {
    return existing;
  }
  const customer: KioskCustomerApi = {
    id: nextCustomerId++,
    documentId,
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    phone: normalizeVenezuelaPhone(request.phone),
    email: request.email?.trim().toLowerCase() ?? '',
  };
  customersByDocument.set(documentId, customer);
  return customer;
}

export function resetMockCustomersForTests(): void {
  customersByDocument.clear();
  nextCustomerId = 2;
  for (const customer of seedCustomers) {
    customersByDocument.set(normalizeDocumentId(customer.documentId), { ...customer });
  }
}
