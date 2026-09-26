import {
  allocateLocalOrderNumber,
  buildLocalOrderNumber,
  claimOrderOutboxForSync,
  countOrderOutboxPending,
  enqueueOrderOutbox,
  findLocalCustomer,
  getLocalComanda,
  getOrderOutboxByClientOrderId,
  insertLocalComanda,
  listLocalComandas,
  markOrderOutboxFailed,
  markOrderOutboxRetry,
  markOrderOutboxSynced,
  nextQueuedOrderOutbox,
  releaseStaleSyncingOrderOutbox,
  requeueOrderOutbox,
  setLocalComandaSynced,
  updateLocalComandaStatus,
  upsertLocalCustomer,
} from '..';
import type { OrderOutboxInput } from '../types';

// Estos tests corren contra SQLite real (sql.js), ver __mocks__/opSqliteSqlJsMock.js.

function outboxInput(clientOrderId: string, overrides: Partial<OrderOutboxInput> = {}): OrderOutboxInput {
  return {
    clientOrderId,
    localNumber: 'K040-0001',
    localSeq: 1,
    paidAt: '2026-09-24T16:01:36.000Z',
    paymentMethod: 'credito',
    origin: 'offline',
    payload: { request: { clientOrderId, items: [] } },
    fiscalInvoiceNumber: 1383,
    posReference: '626720000025',
    ...overrides,
  };
}

describe('localOrderNumberRepo', () => {
  it('formatea K + últimos 3 del serial + secuencia', () => {
    expect(buildLocalOrderNumber('AF910S20250915040', 42)).toBe('K040-0042');
    expect(buildLocalOrderNumber('MDZ-KIOSK-001', 7)).toBe('K001-0007');
    expect(buildLocalOrderNumber('AF910S20250915040', 12345)).toBe('K040-12345');
  });

  it('asigna números monotónicos que no se repiten', async () => {
    const a = await allocateLocalOrderNumber('AF910S20250915040');
    const b = await allocateLocalOrderNumber('AF910S20250915040');
    const c = await allocateLocalOrderNumber('AF910S20250915040');
    expect(b.seq).toBe(a.seq + 1);
    expect(c.seq).toBe(b.seq + 1);
    expect(c.localNumber).toBe(buildLocalOrderNumber('AF910S20250915040', c.seq));
  });
});

describe('orderOutboxRepo', () => {
  it('encolar dos veces la misma venta no duplica', async () => {
    const first = await enqueueOrderOutbox(outboxInput('11111111-1111-4111-8111-111111111111'));
    const again = await enqueueOrderOutbox(outboxInput('11111111-1111-4111-8111-111111111111', { localNumber: 'OTRO' }));
    expect(again.id).toBe(first.id);
    expect(again.localNumber).toBe('K040-0001');
    expect(first.status).toBe('queued');
    expect(first.payload).toEqual({ request: { clientOrderId: '11111111-1111-4111-8111-111111111111', items: [] } });
  });

  it('claim es at-most-once y el ciclo queued → syncing → synced deja los datos del backend', async () => {
    const row = await enqueueOrderOutbox(outboxInput('22222222-2222-4222-8222-222222222222'));
    expect(await claimOrderOutboxForSync(row.id)).toBe(true);
    expect(await claimOrderOutboxForSync(row.id)).toBe(false);
    await markOrderOutboxSynced(row.id, { orderId: 73, displayOrderNumber: 'ORD-2026-0030', shortCode: 'ALYR96' });
    const synced = await getOrderOutboxByClientOrderId('22222222-2222-4222-8222-222222222222');
    expect(synced).toMatchObject({
      status: 'synced',
      syncedOrderId: 73,
      syncedDisplayNumber: 'ORD-2026-0030',
      syncedShortCode: 'ALYR96',
    });
  });

  it('respeta el backoff y es FIFO', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const a = await enqueueOrderOutbox(outboxInput('33333333-3333-4333-8333-333333333333'));
    const b = await enqueueOrderOutbox(outboxInput('44444444-4444-4444-8444-444444444444'));
    await claimOrderOutboxForSync(a.id);
    await markOrderOutboxRetry(a.id, { error: 'timeout', httpStatus: null, nextAttemptAt: future });

    const next = await nextQueuedOrderOutbox(new Date().toISOString());
    // `a` está en backoff: la siguiente elegible es `b` (o una anterior del archivo, nunca `a`)
    expect(next?.clientOrderId).not.toBe('33333333-3333-4333-8333-333333333333');
    const retried = await getOrderOutboxByClientOrderId('33333333-3333-4333-8333-333333333333');
    expect(retried).toMatchObject({ status: 'queued', attempts: 1, lastError: 'timeout', nextAttemptAt: future });
    expect(b.id).toBeGreaterThan(a.id);
  });

  it('failed → requeue; syncing huérfano vuelve a la cola al arrancar; conteo de pendientes', async () => {
    const f = await enqueueOrderOutbox(outboxInput('55555555-5555-4555-8555-555555555555'));
    await markOrderOutboxFailed(f.id, { error: 'Producto inexistente', httpStatus: 400 });
    const s = await enqueueOrderOutbox(outboxInput('66666666-6666-4666-8666-666666666666'));
    await claimOrderOutboxForSync(s.id);

    const before = await countOrderOutboxPending();
    expect(before.failed).toBeGreaterThanOrEqual(1);
    expect(before.syncing).toBeGreaterThanOrEqual(1);

    expect(await releaseStaleSyncingOrderOutbox()).toBeGreaterThanOrEqual(1);
    expect(await requeueOrderOutbox(f.id)).toBe(true);
    expect(await requeueOrderOutbox(f.id)).toBe(false);
    const after = await countOrderOutboxPending();
    expect(after.syncing).toBe(0);
    expect(after.failed).toBe(before.failed - 1);
  });
});

describe('localCustomersRepo', () => {
  it('upsert conserva el backendId ya conocido aunque luego llegue null', async () => {
    await upsertLocalCustomer({ documentId: 'V26396697', firstName: 'Keiver', lastName: 'Pacheco', phone: '04141848823', backendId: 6 });
    await upsertLocalCustomer({ documentId: 'V26396697', firstName: 'Keiver R.', lastName: 'Pacheco', phone: '04141848823', backendId: null });
    const found = await findLocalCustomer('V26396697');
    expect(found).toMatchObject({ firstName: 'Keiver R.', backendId: 6 });
    expect(await findLocalCustomer('V00000000')).toBeNull();
  });
});

describe('localComandasRepo', () => {
  const CLIENT_ORDER_ID = '77777777-7777-4777-8777-777777777777';

  it('inserta idempotente, avanza estado sin retroceder y marca readyAt', async () => {
    const input = {
      clientOrderId: CLIENT_ORDER_ID,
      localNumber: 'K040-0009',
      localSeq: 9,
      tableNumber: null,
      fulfillmentType: 'TAKEOUT',
      paymentMethod: 'credito',
      paymentStatus: 'paid' as const,
      customerName: 'Keiver Pacheco',
      items: [{ productId: 40, name: 'Cajita Feliz Midaz', quantity: 1, notes: null }],
    };
    const created = await insertLocalComanda(input);
    const again = await insertLocalComanda({ ...input, localNumber: 'OTRO' });
    expect(created.id).toBe(`local:${CLIENT_ORDER_ID}`);
    expect(again.localNumber).toBe('K040-0009');
    expect(created.items[0].name).toBe('Cajita Feliz Midaz');

    const ready = await updateLocalComandaStatus(created.id, 'ready');
    expect(ready?.status).toBe('ready');
    expect(ready?.readyAt).not.toBeNull();
    const back = await updateLocalComandaStatus(created.id, 'pending');
    expect(back?.status).toBe('ready');
    expect(await updateLocalComandaStatus('local:no-existe', 'ready')).toBeNull();

    await setLocalComandaSynced(CLIENT_ORDER_ID, { comandaId: 'c-uuid', orderId: 73 });
    const synced = await getLocalComanda(created.id);
    expect(synced).toMatchObject({ syncedComandaId: 'c-uuid', syncedOrderId: 73 });
  });

  it('lista solo lo modificado después del cursor', async () => {
    const cursor = new Date(Date.now() - 1000).toISOString();
    const list = await listLocalComandas({ since: cursor });
    expect(list.map((c) => c.clientOrderId)).toContain(CLIENT_ORDER_ID);
    const none = await listLocalComandas({ since: new Date(Date.now() + 60_000).toISOString() });
    expect(none).toEqual([]);
  });
});
