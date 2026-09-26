import {
  KioskApiError,
  isKioskNetworkError,
  withKioskAuth,
  type CreateKioskOrderResponse,
} from '@shared/api/kiosk';
import { shouldUseMockApi } from '@shared/config/api';
import {
  getKioskConnectivity,
  isKioskOffline,
  markKioskOffline,
  subscribeKioskConnectivity,
} from '@shared/connectivity';
import {
  claimOrderOutboxForSync,
  countOrderOutboxPending,
  getLocalComandaByClientOrderId,
  markOrderOutboxFailed,
  markOrderOutboxRetry,
  markOrderOutboxSynced,
  nextQueuedOrderOutbox,
  releaseStaleSyncingOrderOutbox,
  setLocalComandaSynced,
  type OrderOutboxPendingCounts,
  type OrderOutboxRecord,
} from '@shared/persistence';

import { parseOutboxOrderPayload } from './outboxPayload';

/** Backoff por intento: 5 s · 2^n, tope 10 min. */
export function computeBackoffMs(attempts: number): number {
  const base = 5_000 * 2 ** Math.max(0, attempts);
  return Math.min(base, 10 * 60_000);
}

export type SyncErrorKind = 'network' | 'transient' | 'duplicate' | 'rejected';

/**
 * - network: no hubo respuesta → el drenado para (el kiosko está sin red).
 * - transient: 5xx/429/408 → reintento con backoff.
 * - duplicate: 409 → la orden ya existe; se busca por clientOrderId.
 * - rejected: otro 4xx → la venta queda `failed` para revisión en el panel.
 */
export function classifySyncError(error: unknown): SyncErrorKind {
  if (isKioskNetworkError(error)) {
    return 'network';
  }
  if (error instanceof KioskApiError) {
    if (error.statusCode === 409) {
      return 'duplicate';
    }
    if (error.statusCode >= 500 || error.statusCode === 429 || error.statusCode === 408) {
      return 'transient';
    }
    return 'rejected';
  }
  return 'transient';
}

export type OrderSyncSnapshot = {
  pending: number;
  failed: number;
  draining: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

let snapshot: OrderSyncSnapshot = {
  pending: 0,
  failed: 0,
  draining: false,
  lastSyncAt: null,
  lastError: null,
};
const listeners = new Set<() => void>();

function setSnapshot(patch: Partial<OrderSyncSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

export function getOrderSyncSnapshot(): OrderSyncSnapshot {
  return snapshot;
}

export function subscribeOrderSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshOrderSyncCounts(): Promise<OrderOutboxPendingCounts | null> {
  try {
    const counts = await countOrderOutboxPending();
    setSnapshot({ pending: counts.queued + counts.syncing, failed: counts.failed });
    return counts;
  } catch {
    return null;
  }
}

/**
 * Mientras el cliente paga no se sincroniza: el POST de la venta en curso y el del
 * drenado compiten por la misma red lenta (y el POS no debe esperar).
 */
let checkoutBusy = false;
export function setCheckoutBusy(busy: boolean): void {
  checkoutBusy = busy;
}

export type DrainSummary = { synced: number; failed: number; stoppedBy: string | null };

type SyncedOrderLike = Pick<CreateKioskOrderResponse, 'id' | 'displayOrderNumber' | 'shortCode'>;

let draining: Promise<DrainSummary> | null = null;
let onOrdersSynced: (() => void) | null = null;

/** Drena la cola FIFO. Single-flight: una segunda llamada espera a la primera. */
export function drainOrderOutbox(options?: { force?: boolean }): Promise<DrainSummary> {
  if (draining) {
    return draining;
  }
  draining = runDrain(options?.force === true).finally(() => {
    draining = null;
  });
  return draining;
}

async function markSynced(record: OrderOutboxRecord, order: SyncedOrderLike): Promise<void> {
  await markOrderOutboxSynced(record.id, {
    orderId: order.id || null,
    displayOrderNumber: order.displayOrderNumber || null,
    shortCode: order.shortCode ?? null,
  });
  await setLocalComandaSynced(record.clientOrderId, { orderId: order.id || null }).catch(
    () => undefined,
  );
}

async function runDrain(force: boolean): Promise<DrainSummary> {
  const summary: DrainSummary = { synced: 0, failed: 0, stoppedBy: null };
  if (shouldUseMockApi()) {
    return summary;
  }
  setSnapshot({ draining: true });
  try {
    // Con `force` (botón "Sincronizar ahora") se ignora el backoff pendiente.
    const cutoff = () =>
      force ? '9999-12-31T23:59:59.999Z' : new Date().toISOString();
    for (let i = 0; i < 500; i += 1) {
      if (checkoutBusy && !force) {
        summary.stoppedBy = 'checkout';
        break;
      }
      if (isKioskOffline() && !force) {
        summary.stoppedBy = 'offline';
        break;
      }
      const record = await nextQueuedOrderOutbox(cutoff());
      if (!record) {
        break;
      }
      if (!(await claimOrderOutboxForSync(record.id, 'queued'))) {
        continue;
      }
      const outcome = await syncOne(record);
      if (outcome === 'synced') {
        summary.synced += 1;
        continue;
      }
      if (outcome === 'failed') {
        summary.failed += 1;
        continue;
      }
      // Red caída o backend con problemas: se sigue en el próximo ciclo.
      summary.stoppedBy = outcome;
      break;
    }
  } catch (error) {
    summary.stoppedBy = 'error';
    setSnapshot({ lastError: error instanceof Error ? error.message : String(error) });
  } finally {
    await refreshOrderSyncCounts();
    setSnapshot({
      draining: false,
      ...(summary.synced > 0 ? { lastSyncAt: new Date().toISOString(), lastError: null } : {}),
    });
  }
  if (summary.synced > 0) {
    onOrdersSynced?.();
  }
  return summary;
}

async function syncOne(
  record: OrderOutboxRecord,
): Promise<'synced' | 'failed' | 'network' | 'transient'> {
  const payload = parseOutboxOrderPayload(record.payload);
  if (!payload) {
    await markOrderOutboxFailed(record.id, { error: 'Payload local inválido' });
    return 'failed';
  }
  const comanda = await getLocalComandaByClientOrderId(record.clientOrderId).catch(() => null);
  const request = {
    ...payload.request,
    clientOrderId: record.clientOrderId,
    ...(comanda
      ? {
          comandaStatus: comanda.status,
          ...(comanda.readyAt ? { comandaReadyAt: comanda.readyAt } : {}),
        }
      : {}),
  };

  try {
    const response = await withKioskAuth((client) =>
      client.createOrder(request, { idempotencyKey: record.clientOrderId }),
    );
    await markSynced(record, response);
    return 'synced';
  } catch (error) {
    const kind = classifySyncError(error);
    const message = error instanceof Error ? error.message : String(error);
    const httpStatus = error instanceof KioskApiError ? error.statusCode : null;
    setSnapshot({ lastError: message });

    if (kind === 'duplicate') {
      try {
        const existing = await withKioskAuth((client) =>
          client.getOrderByClientId(record.clientOrderId),
        );
        if (existing) {
          await markSynced(record, existing);
          return 'synced';
        }
      } catch {
        // cae al reintento
      }
    }
    if (kind === 'rejected') {
      await markOrderOutboxFailed(record.id, { error: message, httpStatus });
      return 'failed';
    }
    await markOrderOutboxRetry(record.id, {
      error: message,
      httpStatus,
      nextAttemptAt: new Date(Date.now() + computeBackoffMs(record.attempts)).toISOString(),
    });
    if (kind === 'network') {
      markKioskOffline(message);
      return 'network';
    }
    return 'transient';
  }
}

const IDLE_INTERVAL_MS = 60_000;

/**
 * Vive toda la sesión: drena al arrancar, al volver la conexión y cada 60 s si
 * queda algo en cola. `onSynced` refresca el catálogo (stock) tras sincronizar.
 */
export function startOrderSyncWorker(options?: { onSynced?: () => void }): () => void {
  if (shouldUseMockApi()) {
    return () => undefined;
  }
  onOrdersSynced = options?.onSynced ?? null;
  let stopped = false;
  let lastStatus = getKioskConnectivity().status;

  void (async () => {
    // Filas que quedaron `syncing` porque la app murió a mitad del envío.
    await releaseStaleSyncingOrderOutbox().catch(() => 0);
    const counts = await refreshOrderSyncCounts();
    if (!stopped && counts && counts.queued > 0) {
      void drainOrderOutbox();
    }
  })();

  const unsubscribe = subscribeKioskConnectivity(() => {
    const status = getKioskConnectivity().status;
    const cameBack = lastStatus === 'offline' && (status === 'online' || status === 'degraded');
    lastStatus = status;
    if (cameBack && !stopped) {
      void drainOrderOutbox();
    }
  });

  const interval = setInterval(() => {
    if (!stopped && snapshot.pending > 0) {
      void drainOrderOutbox();
    }
  }, IDLE_INTERVAL_MS);

  return () => {
    stopped = true;
    unsubscribe();
    clearInterval(interval);
    onOrdersSynced = null;
  };
}
