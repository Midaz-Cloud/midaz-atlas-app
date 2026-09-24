import type { LocalComandaRecord } from '@shared/persistence';

import { handleLanRequest, resolveSince, type LanRouterDeps } from '../lanComandaRouter';
import { pickLanIp } from '../lanComandaServer';

const NOW = new Date('2026-09-24T18:00:00.000Z');

function comanda(overrides: Partial<LocalComandaRecord> = {}): LocalComandaRecord {
  return {
    id: 'local:5f0c9a1e-2b3d-4c5e-8f70-112233445566',
    clientOrderId: '5f0c9a1e-2b3d-4c5e-8f70-112233445566',
    localNumber: 'K001-0007',
    localSeq: 7,
    shortCode: 'K001-0007',
    tableNumber: null,
    fulfillmentType: 'IN_STORE',
    paymentMethod: 'debito',
    paymentStatus: 'paid',
    customerName: 'Keiver Pacheco',
    items: [
      {
        productId: 12,
        name: 'Hamburguesa Clásica',
        quantity: 2,
        notes: null,
        selections: { modifiers: [{ groupName: 'Extras', optionName: 'Tocineta', quantity: 1, priceDelta: 1 }] },
      },
    ],
    status: 'pending',
    createdAt: '2026-09-24T17:50:00.000Z',
    updatedAt: '2026-09-24T17:50:00.000Z',
    readyAt: null,
    syncedComandaId: null,
    syncedOrderId: null,
    ...overrides,
  };
}

function deps(overrides: Partial<LanRouterDeps> = {}): LanRouterDeps {
  return {
    now: () => NOW,
    kioskSerial: 'MDZ-KIOSK-001',
    appVersion: '1.1',
    isKioskOnline: () => false,
    pendingSync: () => 3,
    listComandas: jest.fn(async () => [comanda()]),
    updateComandaStatus: jest.fn(async (_id, status) => comanda({ status })),
    ...overrides,
  };
}

const req = (method: string, path: string, extra: { query?: string; body?: string } = {}) => ({
  method,
  path,
  query: extra.query ?? '',
  body: extra.body ?? '',
});

describe('handleLanRequest', () => {
  it('health: estado del kiosko sin clave', async () => {
    const res = await handleLanRequest(req('GET', '/lan/v1/health'), deps());
    expect(res).toEqual({
      status: 200,
      body: {
        ok: true,
        kioskSerial: 'MDZ-KIOSK-001',
        appVersion: '1.1',
        kioskOnline: false,
        pendingSync: 3,
        serverTime: NOW.toISOString(),
        lanProtocol: 1,
      },
    });
  });

  it('GET comandas: array con la forma de /comandas, cursor since y X-Kiosk-Server-Time', async () => {
    const d = deps();
    const res = await handleLanRequest(
      req('GET', '/lan/v1/comandas', { query: 'since=2026-09-24T17%3A00%3A00.000Z' }),
      d,
    );

    expect(d.listComandas).toHaveBeenCalledWith({ since: '2026-09-24T17:00:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.headers).toEqual({ 'X-Kiosk-Server-Time': NOW.toISOString() });
    const [row] = res.body as any[];
    expect(row).toMatchObject({
      id: 'local:5f0c9a1e-2b3d-4c5e-8f70-112233445566',
      source: 'kiosk',
      clientOrderId: '5f0c9a1e-2b3d-4c5e-8f70-112233445566',
      shortCode: 'K001-0007',
      displayOrderNumber: 'K001-0007',
      orderNumber: 7,
      orderId: null,
      paymentStatus: 'paid',
      status: 'pending',
      order: {
        clientOrderId: '5f0c9a1e-2b3d-4c5e-8f70-112233445566',
        kioskLocalNumber: 'K001-0007',
        customerName: 'Keiver Pacheco',
      },
    });
    expect(row.itemsSnapshot[0].selections.modifiers[0]).toMatchObject({ optionName: 'Tocineta' });
  });

  it('since inválido o ausente → últimas 48 h (sin 400)', () => {
    expect(resolveSince(null, NOW)).toBe('2026-09-22T18:00:00.000Z');
    expect(resolveSince('ayer', NOW)).toBe('2026-09-22T18:00:00.000Z');
  });

  it('PATCH status: valida, decodifica el id y devuelve la fila', async () => {
    const d = deps();
    const res = await handleLanRequest(
      req('PATCH', '/lan/v1/comandas/local%3A5f0c9a1e-2b3d-4c5e-8f70-112233445566/status', {
        body: JSON.stringify({ status: 'ready' }),
      }),
      d,
    );
    expect(d.updateComandaStatus).toHaveBeenCalledWith('local:5f0c9a1e-2b3d-4c5e-8f70-112233445566', 'ready');
    expect(res.status).toBe(200);
    expect((res.body as any).status).toBe('ready');
  });

  it('PATCH status: 400 inválido, 404 inexistente', async () => {
    const path = '/lan/v1/comandas/local%3Ax/status';
    expect((await handleLanRequest(req('PATCH', path, { body: '{"status":"cancelled"}' }), deps())).status).toBe(400);
    expect((await handleLanRequest(req('PATCH', path, { body: 'no-json' }), deps())).status).toBe(400);
    const missing = deps({ updateComandaStatus: jest.fn(async () => null) });
    expect((await handleLanRequest(req('PATCH', path, { body: '{"status":"ready"}' }), missing)).status).toBe(404);
  });

  it('método o ruta desconocidos', async () => {
    expect((await handleLanRequest(req('POST', '/lan/v1/comandas'), deps())).status).toBe(405);
    expect((await handleLanRequest(req('GET', '/lan/v1/nada'), deps())).status).toBe(404);
  });
});

describe('pickLanIp', () => {
  it('prefiere la Wi‑Fi', () => {
    expect(
      pickLanIp([
        { interface: 'eth0', address: '192.168.0.9' },
        { interface: 'wlan0', address: '10.182.5.22' },
      ]),
    ).toBe('10.182.5.22');
    expect(pickLanIp([])).toBeNull();
  });
});
