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

export function mockUpdateCustomer(
  customerId: number,
  request: RegisterKioskCustomerRequest,
): KioskCustomerApi {
  const existing = [...customersByDocument.values()].find((customer) => customer.id === customerId);
  if (!existing) {
    throw new Error('Cliente no encontrado');
  }
  const email = request.email?.trim().toLowerCase() ?? '';
  const updated: KioskCustomerApi = {
    ...existing,
    firstName: request.firstName.trim() || existing.firstName,
    lastName: request.lastName.trim() || existing.lastName,
    phone: request.phone ? normalizeVenezuelaPhone(request.phone) : existing.phone,
    email: email || existing.email,
  };
  customersByDocument.set(normalizeDocumentId(updated.documentId), updated);
  return updated;
}

export function resetMockCustomersForTests(): void {
  customersByDocument.clear();
  nextCustomerId = 2;
  for (const customer of seedCustomers) {
    customersByDocument.set(normalizeDocumentId(customer.documentId), { ...customer });
  }
}
