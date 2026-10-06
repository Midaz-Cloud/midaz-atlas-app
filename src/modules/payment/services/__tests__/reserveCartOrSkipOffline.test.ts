import { KioskApiError, KioskNetworkError } from '@shared/api/kiosk/errors';
import { isKioskOffline } from '@shared/connectivity';
import {
  __resetKioskConnectivityForTests,
  markKioskOffline,
} from '@shared/connectivity/kioskConnectivityStore';

import { getEnabledPaymentMethods } from '../../data/getEnabledPaymentMethods';
import { reserveCartOrSkipOffline } from '../reserveCartOrSkipOffline';
import { reserveCartBeforePayment } from '../reserveCartBeforePayment';

jest.mock('../reserveCartBeforePayment', () => ({
  reserveCartBeforePayment: jest.fn(),
}));

jest.mock('@shared/config/api', () => ({
  ...jest.requireActual('@shared/config/api'),
  shouldUseMockApi: () => false,
}));

const reserve = reserveCartBeforePayment as jest.Mock;
const lines = [{ lineId: 'l1', productId: 'p1', quantity: 1, unitPrice: 5 }];

describe('reserveCartOrSkipOffline', () => {
  beforeEach(() => {
    __resetKioskConnectivityForTests();
    reserve.mockReset();
  });

  it('en línea devuelve la reserva del backend', async () => {
    reserve.mockResolvedValue({ ok: true, reservationId: 'r1', serverPrices: [] });
    await expect(reserveCartOrSkipOffline(lines)).resolves.toEqual({
      ok: true,
      reservationId: 'r1',
      serverPrices: [],
    });
  });

  it('offline ni lo intenta: sigue sin reserva', async () => {
    markKioskOffline('test');
    await expect(reserveCartOrSkipOffline(lines)).resolves.toMatchObject({
      ok: true,
      reservationId: null,
      offline: true,
    });
    expect(reserve).not.toHaveBeenCalled();
  });

  it('red caída o 5xx: pasa a offline y sigue sin reserva', async () => {
    reserve.mockRejectedValueOnce(new KioskNetworkError('timeout', '/kiosk/cart/reserve'));
    await expect(reserveCartOrSkipOffline(lines)).resolves.toMatchObject({ offline: true });
    expect(isKioskOffline()).toBe(true);

    __resetKioskConnectivityForTests();
    reserve.mockRejectedValueOnce(new KioskApiError('Bad gateway', 502));
    await expect(reserveCartOrSkipOffline(lines)).resolves.toMatchObject({ offline: true });
  });

  it('un rechazo real (4xx) se propaga como siempre', async () => {
    reserve.mockRejectedValueOnce(new KioskApiError('Carrito inválido', 400));
    await expect(reserveCartOrSkipOffline(lines)).rejects.toThrow('Carrito inválido');
  });
});

describe('getEnabledPaymentMethods offline', () => {
  const account = { bankCode: '0102', phone: '04141234567', documentId: 'V12345678' } as never;

  it('sin red solo queda tarjeta; efectivo solo si se permite', () => {
    const online = getEnabledPaymentMethods(['debito', 'pago_movil', 'efectivo'], {
      pagoMovilAccount: account,
    }).map((m) => m.id);
    const offline = getEnabledPaymentMethods(['debito', 'pago_movil', 'efectivo'], {
      pagoMovilAccount: account,
      offline: true,
    }).map((m) => m.id);
    const offlineCash = getEnabledPaymentMethods(['debito', 'pago_movil', 'efectivo'], {
      pagoMovilAccount: account,
      offline: true,
      offlineCashAllowed: true,
    }).map((m) => m.id);

    expect(online).toContain('pos');
    expect(offline).toEqual(['pos']);
    expect(offlineCash.sort()).toEqual(online.filter((id) => id === 'pos' || id === 'cash').sort());
  });
});
