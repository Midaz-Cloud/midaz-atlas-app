import AsyncStorage from '@react-native-async-storage/async-storage';

import { KioskApiError, KioskNetworkError } from '../errors';
import { fetchWithTimeout } from '../http/fetchWithTimeout';
import { __resetKioskConnectivityForTests, getKioskConnectivity } from '@shared/connectivity/kioskConnectivityStore';

const mockLogin = jest.fn();
const mockCreateClient = jest.fn((token?: string) => ({ token, login: mockLogin }));

jest.mock('../factory', () => ({
  createKioskApiClient: (token?: string) => mockCreateClient(token),
}));
jest.mock('@shared/device', () => ({
  getKioskDeviceProfile: jest.fn(async () => ({ serialNumber: 'AF910S20250915040' })),
}));

import { __resetKioskReauthForTests, reloginKiosk, withKioskAuth } from '../withKioskAuth';
import { saveAccessToken } from '../tokenStorage';

describe('withKioskAuth', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockLogin.mockReset();
    mockCreateClient.mockClear();
    __resetKioskReauthForTests();
  });

  it('usa el token vigente sin re-loguear', async () => {
    await saveAccessToken('vigente');
    const result = await withKioskAuth(async (client) => (client as unknown as { token: string }).token);
    expect(result).toBe('vigente');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('sin token (vencido) re-loguea antes de llamar', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'nuevo' });
    const result = await withKioskAuth(async (client) => (client as unknown as { token: string }).token);
    expect(result).toBe('nuevo');
    expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: 'AF910S20250915040' }));
  });

  it('ante 401 re-loguea una vez y reintenta', async () => {
    await saveAccessToken('revocado');
    mockLogin.mockResolvedValue({ accessToken: 'nuevo' });
    const run = jest.fn(async (client: unknown) => {
      if ((client as { token: string }).token === 'revocado') {
        throw new KioskApiError('Unauthorized', 401);
      }
      return 'ok';
    });
    await expect(withKioskAuth(run)).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('otros errores se propagan sin re-login', async () => {
    await saveAccessToken('vigente');
    await expect(withKioskAuth(async () => { throw new KioskApiError('Bad', 400); })).rejects.toThrow('Bad');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('reloginKiosk es single-flight y devuelve null si falla', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockLogin.mockReturnValue(new Promise((r) => { resolve = r; }));
    const a = reloginKiosk();
    const b = reloginKiosk();
    resolve({ accessToken: 'uno' });
    await expect(Promise.all([a, b])).resolves.toEqual(['uno', 'uno']);
    expect(mockLogin).toHaveBeenCalledTimes(1);

    mockLogin.mockRejectedValue(new Error('sin red'));
    await expect(reloginKiosk()).resolves.toBeNull();
  });
});

describe('fetchWithTimeout', () => {
  const realFetch = global.fetch;
  beforeEach(() => __resetKioskConnectivityForTests());
  afterEach(() => { global.fetch = realFetch; });

  it('un error de red se convierte en KioskNetworkError y se reporta al store', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(fetchWithTimeout('http://x/kiosk/orders', {}, 1000, '/kiosk/orders')).rejects.toBeInstanceOf(KioskNetworkError);
    expect(getKioskConnectivity().lastError).toBe('/kiosk/orders');
  });

  it('timeout → KioskNetworkError kind timeout', async () => {
    global.fetch = jest.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
    ) as unknown as typeof fetch;
    const error = await fetchWithTimeout('http://x', {}, 10, '/kiosk/config').catch((e) => e);
    expect(error).toBeInstanceOf(KioskNetworkError);
    expect((error as KioskNetworkError).kind).toBe('timeout');
  });

  it('una respuesta HTTP (aunque sea 500) cuenta como red disponible', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 500, ok: false }) as unknown as typeof fetch;
    const response = await fetchWithTimeout('http://x', {}, 1000, '/kiosk/orders');
    expect(response.status).toBe(500);
  });
});
