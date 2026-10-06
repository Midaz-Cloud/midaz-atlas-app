import { KioskApiError, KioskNetworkError } from '@shared/api/kiosk/errors';
import { __resetKioskConnectivityForTests } from '@shared/connectivity/kioskConnectivityStore';
import { isKioskOffline } from '@shared/connectivity';
import {
  enqueueOrderOutbox,
  getLocalComandaByClientOrderId,
  getOrderOutboxByClientOrderId,
  insertLocalComanda,
  updateLocalComandaStatus,
  localComandaId,
} from '@shared/persistence';

import {
  classifySyncError,
  computeBackoffMs,
  drainOrderOutbox,
  getOrderSyncSnapshot,
  setCheckoutBusy,
} from '../orderSyncWorker';

const mockCreateOrder = jest.fn();
const mockGetOrderByClientId = jest.fn();

jest.mock('@shared/api/kiosk', () => {
  const errors = jest.requireActual('@shared/api/kiosk/errors');
  return {
    ...errors,
    withKioskAuth: (run: (client: unknown) => unknown) =>
      run({
        createOrder: (...args: unknown[]) => mockCreateOrder(...args),
        getOrderByClientId: (...args: unknown[]) => mockGetOrderByClientId(...args),
      }),
  };
});

jest.mock('@shared/config/api', () => ({
  ...jest.requireActual('@shared/config/api'),
  shouldUseMockApi: () => false,
}));

let seq = 0;
function nextId(): string {
  seq += 1;
  return `7a6b5c4d-3e2f-4a1b-9c8d-${String(seq).padStart(12, '0')}`;
}

async function enqueue(clientOrderId: string, localNumber = `K001-${String(seq).padStart(4, '0')}`) {
  return enqueueOrderOutbox({
    clientOrderId,
    localNumber,
    localSeq: seq,
    paidAt: '2026-09-24T16:01:36.000Z',
    paymentMethod: 'debito',
    origin: 'offline',
    payload: {
      version: 1,
      request: {
        items: [{ productId: 1, quantity: 1, taxRate: 16, isExempt: false, unitPrice: 9.5 }],
        fulfillmentType: 'IN_STORE',
        paymentMethod: 'debito',
        clientOrderId,
        offline: true,
        paidAt: '2026-09-24T16:01:36.000Z',
        localOrderNumber: localNumber,
      },
      ticket: { displayOrderNumber: localNumber, lines: [], totals: {}, usdToVesRate: 1 },
    },
  });
}

const OK_RESPONSE = { id: 90, displayOrderNumber: 'ORD-2026-0090', shortCode: 'XYZ123' };

describe('orderSyncWorker', () => {
  beforeEach(async () => {
    __resetKioskConnectivityForTests();
    setCheckoutBusy(false);
    mockCreateOrder.mockReset();
    mockGetOrderByClientId.mockReset();
    // Vacía lo que dejó el test anterior.
    mockCreateOrder.mockResolvedValue(OK_RESPONSE);
    await drainOrderOutbox({ force: true });
    mockCreateOrder.mockReset();
  });

  it('computeBackoffMs: 5 s · 2^n con tope de 10 min', () => {
    expect(computeBackoffMs(0)).toBe(5_000);
    expect(computeBackoffMs(3)).toBe(40_000);
    expect(computeBackoffMs(20)).toBe(600_000);
  });

  it('classifySyncError', () => {
    expect(classifySyncError(new KioskNetworkError('timeout', '/kiosk/orders'))).toBe('network');
    expect(classifySyncError(new KioskApiError('x', 503))).toBe('transient');
    expect(classifySyncError(new KioskApiError('x', 429))).toBe('transient');
    expect(classifySyncError(new KioskApiError('x', 409))).toBe('duplicate');
    expect(classifySyncError(new KioskApiError('x', 422))).toBe('rejected');
  });

  it('envía FIFO con la misma idempotency key y el estado que marcó cocina', async () => {
    const first = nextId();
    const second = nextId();
    await enqueue(first);
    await enqueue(second);
    await insertLocalComanda({
      clientOrderId: first,
      localNumber: 'K001-0001',
      localSeq: 1,
      tableNumber: null,
      fulfillmentType: 'IN_STORE',
      paymentMethod: 'debito',
      paymentStatus: 'paid',
      customerName: null,
      items: [],
    });
    await updateLocalComandaStatus(localComandaId(first), 'ready');
    mockCreateOrder.mockResolvedValue(OK_RESPONSE);

    const summary = await drainOrderOutbox();

    expect(summary).toMatchObject({ synced: 2, failed: 0, stoppedBy: null });
    const [firstRequest, firstOptions] = mockCreateOrder.mock.calls[0];
    expect(firstRequest).toMatchObject({ clientOrderId: first, comandaStatus: 'ready', offline: true });
    expect(firstRequest.comandaReadyAt).toEqual(expect.any(String));
    expect(firstOptions).toEqual({ idempotencyKey: first });
    expect(mockCreateOrder.mock.calls[1][0].clientOrderId).toBe(second);
    expect(await getOrderOutboxByClientOrderId(first)).toMatchObject({
      status: 'synced',
      syncedOrderId: 90,
      syncedDisplayNumber: 'ORD-2026-0090',
    });
    expect(await getLocalComandaByClientOrderId(first)).toMatchObject({ syncedOrderId: 90 });
    expect(getOrderSyncSnapshot().pending).toBe(0);
  });

  it('sin red: la fila vuelve a la cola con backoff, el kiosko pasa a offline y el drenado se detiene', async () => {
    const id = nextId();
    const other = nextId();
    await enqueue(id);
    await enqueue(other);
    mockCreateOrder.mockRejectedValue(new KioskNetworkError('network', '/kiosk/orders'));

    const summary = await drainOrderOutbox();

    expect(summary.stoppedBy).toBe('network');
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(isKioskOffline()).toBe(true);
    const row = await getOrderOutboxByClientOrderId(id);
    expect(row).toMatchObject({ status: 'queued', attempts: 1 });
    expect(new Date(row!.nextAttemptAt!).getTime()).toBeGreaterThan(Date.now());
    expect(getOrderSyncSnapshot().pending).toBe(2);
  });

  it('409: busca la orden por clientOrderId y la marca sincronizada', async () => {
    const id = nextId();
    await enqueue(id);
    mockCreateOrder.mockRejectedValue(new KioskApiError('Conflict', 409));
    mockGetOrderByClientId.mockResolvedValue(OK_RESPONSE);

    await drainOrderOutbox();

    expect(mockGetOrderByClientId).toHaveBeenCalledWith(id);
    expect(await getOrderOutboxByClientOrderId(id)).toMatchObject({ status: 'synced' });
  });

  it('4xx: queda failed para revisión y sigue con la siguiente', async () => {
    const bad = nextId();
    const good = nextId();
    await enqueue(bad);
    await enqueue(good);
    mockCreateOrder
      .mockRejectedValueOnce(new KioskApiError('Producto inválido', 422))
      .mockResolvedValueOnce(OK_RESPONSE);

    const summary = await drainOrderOutbox();

    expect(summary).toMatchObject({ synced: 1, failed: 1 });
    expect(await getOrderOutboxByClientOrderId(bad)).toMatchObject({
      status: 'failed',
      lastErrorStatus: 422,
    });
    expect(await getOrderOutboxByClientOrderId(good)).toMatchObject({ status: 'synced' });
  });

  it('no sincroniza mientras el cliente paga (salvo forzado)', async () => {
    await enqueue(nextId());
    setCheckoutBusy(true);

    const summary = await drainOrderOutbox();

    expect(summary.stoppedBy).toBe('checkout');
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });
});
