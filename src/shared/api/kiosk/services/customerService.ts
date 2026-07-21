import type { KioskCustomer } from '@shared/customer';
import { shouldUseMockApi } from '@shared/config';

import { createCustomerLive } from '../http/customerCreate';
import { lookupCustomerByCedulaLive } from '../http/customerLookup';
import { mapApiCustomerToKioskCustomer, mapRegisterRequestToApi } from '../mappers/customer';
import { mockFindCustomerByDocument, mockRegisterCustomer } from '../mock/mockCustomers';
import type { CustomerRegisterPrefill } from '../types/customerLookup';
import { normalizeDocumentId } from '../utils/documentId';

export type { CustomerRegisterPrefill };

export type LookupCustomerResult =
  | { status: 'found'; customer: KioskCustomer }
  | {
      status: 'register';
      documentId: string;
      prefill?: CustomerRegisterPrefill;
      lookupSource?: 'cne' | 'org';
    }
  | { status: 'not_found'; documentId: string }
  | { status: 'error'; message: string; documentId: string };

export type RegisterCustomerResult =
  | { status: 'ok'; customer: KioskCustomer }
  | { status: 'error'; message: string };

export async function lookupCustomerByDocument(
  documentId: string,
): Promise<LookupCustomerResult> {
  const normalized = normalizeDocumentId(documentId);

  if (shouldUseMockApi()) {
    return lookupCustomerByDocumentMock(normalized);
  }

  const live = await lookupCustomerByCedulaLive(normalized);

  switch (live.status) {
    case 'found':
      return { status: 'found', customer: live.customer };
    case 'register':
      return {
        status: 'register',
        documentId: live.documentId,
        prefill: live.prefill,
        lookupSource: live.source,
      };
    case 'not_found':
      return { status: 'not_found', documentId: live.documentId };
    case 'error':
      return {
        status: 'error',
        message: live.message,
        documentId: live.documentId,
      };
  }
}

function lookupCustomerByDocumentMock(documentId: string): LookupCustomerResult {
  const api = mockFindCustomerByDocument(documentId);
  if (api) {
    return { status: 'found', customer: mapApiCustomerToKioskCustomer(api) };
  }
  return { status: 'not_found', documentId };
}

export async function registerKioskCustomer(params: {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<RegisterCustomerResult> {
  if (!shouldUseMockApi()) {
    const live = await createCustomerLive(params);
    if (live.status === 'ok') {
      return live;
    }
    return { status: 'error', message: live.message };
  }

  try {
    const request = mapRegisterRequestToApi(params);
    const api = mockRegisterCustomer(request);
    return { status: 'ok', customer: mapApiCustomerToKioskCustomer(api) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al registrar el cliente';
    return { status: 'error', message };
  }
}
