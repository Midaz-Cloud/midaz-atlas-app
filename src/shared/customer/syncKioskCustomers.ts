import AsyncStorage from '@react-native-async-storage/async-storage';

import { withKioskAuth, type KioskCustomerSyncRow } from '@shared/api/kiosk';
import { mapOrgCustomerToKioskCustomer } from '@shared/api/kiosk/mappers/lookupCedula';
import { shouldUseMockApi } from '@shared/config/api';
import { isKioskOffline } from '@shared/connectivity';
import { upsertLocalCustomer } from '@shared/persistence';

const CURSOR_KEY = 'kiosk_customers_sync_cursor';
const MAX_PAGES_PER_RUN = 50;
const INTERVAL_MS = 30 * 60_000;

/** Fila del backend → cliente del caché local (mismo mapeo que la búsqueda en vivo). */
export function mapSyncRowToLocalCustomer(row: KioskCustomerSyncRow) {
  if (!row.typeIdentification || !row.identificationNumber) {
    return null;
  }
  const customer = mapOrgCustomerToKioskCustomer({
    id: row.id,
    typeIdentification: row.typeIdentification,
    identificationNumber: row.identificationNumber,
    name: row.name ?? '',
    billingName: row.billingName ?? '',
    phoneNumber: row.phoneNumber ?? undefined,
    email: row.email ?? undefined,
  });
  if (!customer.documentId || customer.documentId.length < 2) {
    return null;
  }
  return {
    documentId: customer.documentId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email || null,
    backendId: row.id,
  };
}

let running: Promise<number> | null = null;

/**
 * Baja al kiosko los clientes de la org (incremental por cursor) para que, sin
 * red, un cliente habitual no tenga que volver a escribir sus datos. Single-flight.
 * Devuelve cuántos clientes se guardaron en esta pasada.
 */
export function syncKioskCustomers(): Promise<number> {
  if (running) {
    return running;
  }
  running = (async () => {
    if (shouldUseMockApi() || isKioskOffline()) {
      return 0;
    }
    let cursor = await AsyncStorage.getItem(CURSOR_KEY).catch(() => null);
    let saved = 0;
    for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
      const result = await withKioskAuth((client) => client.syncCustomers(cursor));
      for (const row of result.data) {
        const local = mapSyncRowToLocalCustomer(row);
        if (local) {
          await upsertLocalCustomer(local);
          saved += 1;
        }
      }
      // El cursor avanza por página: un corte a mitad retoma donde quedó.
      const last = result.data[result.data.length - 1];
      const nextCursor = result.nextCursor ?? (last ? `${last.updatedAt}|${last.id}` : cursor);
      if (nextCursor && nextCursor !== cursor) {
        cursor = nextCursor;
        await AsyncStorage.setItem(CURSOR_KEY, nextCursor).catch(() => undefined);
      }
      if (!result.nextCursor) {
        break;
      }
    }
    return saved;
  })()
    .catch((error) => {
      if (__DEV__) {
        console.warn('[syncKioskCustomers] failed', error);
      }
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

/** Al arrancar en línea y cada 30 min. */
export function startKioskCustomerSync(): () => void {
  if (shouldUseMockApi()) {
    return () => undefined;
  }
  void syncKioskCustomers();
  const interval = setInterval(() => {
    void syncKioskCustomers();
  }, INTERVAL_MS);
  return () => clearInterval(interval);
}
