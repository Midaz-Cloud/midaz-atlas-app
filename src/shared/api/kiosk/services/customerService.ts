import type { KioskCustomer } from '@shared/customer';
import { shouldUseMockApi } from '@shared/config';
import { isKioskOffline } from '@shared/connectivity';
import { findLocalCustomer, upsertLocalCustomer } from '@shared/persistence';

import { createCustomerLive } from '../http/customerCreate';
import { lookupCustomerByCedulaLive } from '../http/customerLookup';
import { updateCustomerLive } from '../http/customerUpdate';
import { mapApiCustomerToKioskCustomer, mapRegisterRequestToApi } from '../mappers/customer';
import {
  mockFindCustomerByDocument,
  mockRegisterCustomer,
  mockUpdateCustomer,
} from '../mock/mockCustomers';
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
  /** `offline`: no se pudo consultar (sin red) y el kiosko no lo tiene; registro local. */
  | { status: 'not_found'; documentId: string; offline?: true }
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

  if (isKioskOffline()) {
    return lookupCustomerOffline(normalized);
  }

  const live = await lookupCustomerByCedulaLive(normalized);

  switch (live.status) {
    case 'found':
      void cacheCustomerLocally(live.customer);
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
      if (live.networkError) {
        return lookupCustomerOffline(normalized);
      }
      return {
        status: 'error',
        message: live.message,
        documentId: live.documentId,
      };
  }
}

/** Sin backend: el caché de clientes que el kiosko ya vio; si no está, registro local. */
async function lookupCustomerOffline(documentId: string): Promise<LookupCustomerResult> {
  try {
    const local = await findLocalCustomer(documentId);
    if (local) {
      return {
        status: 'found',
        customer: {
          id: local.backendId,
          documentId: local.documentId,
          firstName: local.firstName,
          lastName: local.lastName,
          phone: local.phone,
          email: local.email ?? '',
          source: 'local',
        },
      };
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[customerService] local customer lookup failed', error);
    }
  }
  return { status: 'not_found', documentId, offline: true };
}

async function cacheCustomerLocally(customer: KioskCustomer): Promise<void> {
  try {
    await upsertLocalCustomer({
      documentId: customer.documentId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email || null,
      backendId: customer.id,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[customerService] cache customer failed', error);
    }
  }
}

/** Registro sin red: queda en el kiosko y viaja como snapshot en la orden. */
async function registerCustomerLocally(params: {
  documentId: string;
  customerId?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<RegisterCustomerResult> {
  try {
    await upsertLocalCustomer({
      documentId: params.documentId,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      email: params.email ?? null,
      backendId: params.customerId ?? null,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[customerService] local register failed', error);
    }
  }
  return {
    status: 'ok',
    customer: {
      id: params.customerId ?? null,
      documentId: params.documentId,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      email: params.email ?? '',
      source: 'local',
    },
  };
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
    if (isKioskOffline()) {
      return registerCustomerLocally(params);
    }
    const live = await createCustomerLive(params);
    if (live.status === 'ok') {
      void cacheCustomerLocally(live.customer);
      return live;
    }
    if (live.networkError) {
      return registerCustomerLocally(params);
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

export async function updateKioskCustomer(params: {
  customerId: number;
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}): Promise<RegisterCustomerResult> {
  if (!shouldUseMockApi()) {
    if (isKioskOffline()) {
      return registerCustomerLocally(params);
    }
    const live = await updateCustomerLive(params);
    if (live.status === 'ok') {
      void cacheCustomerLocally(live.customer);
      return live;
    }
    return { status: 'error', message: live.message };
  }

  try {
    const request = mapRegisterRequestToApi(params);
    const api = mockUpdateCustomer(params.customerId, request);
    return { status: 'ok', customer: mapApiCustomerToKioskCustomer(api) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al actualizar el cliente';
    return { status: 'error', message };
  }
}
