import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

type Store = typeof import('../deviceSecretStorage');
const actual = jest.requireActual<Store>('../deviceSecretStorage');

type Native = Record<string, jest.Mock>;
const native = (): Native => (NativeModules as { KioskDeviceModule?: Native }).KioskDeviceModule as Native;

describe('deviceSecretStorage (nativo)', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const mem = new Map<string, string>();
    (NativeModules as Record<string, unknown>).KioskDeviceModule = {
      setDeviceSecret: jest.fn(async (v: string) => void mem.set('device_secret', v)),
      getDeviceSecret: jest.fn(async () => mem.get('device_secret') ?? null),
      clearDeviceSecret: jest.fn(async () => void mem.delete('device_secret')),
      setSecureItem: jest.fn(async (k: string, v: string) => void mem.set(k, v)),
      getSecureItem: jest.fn(async (k: string) => mem.get(k) ?? null),
      removeSecureItem: jest.fn(async (k: string) => void mem.delete(k)),
    };
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete (NativeModules as Record<string, unknown>).KioskDeviceModule;
  });

  it('guarda, lee y borra el secreto con los métodos nativos, sin tocar AsyncStorage', async () => {
    const spy = jest.spyOn(AsyncStorage, 'setItem');
    await actual.saveDeviceSecret('abc');
    expect(native().setDeviceSecret).toHaveBeenCalledWith('abc');
    expect(await actual.loadDeviceSecret()).toBe('abc');
    await actual.clearDeviceSecret();
    expect(await actual.loadDeviceSecret()).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('items seguros genéricos (token de sesión)', async () => {
    await actual.saveSecureItem('tok', 'v');
    expect(native().setSecureItem).toHaveBeenCalledWith('tok', 'v');
    expect(await actual.loadSecureItem('tok')).toBe('v');
    await actual.removeSecureItem('tok');
    expect(await actual.loadSecureItem('tok')).toBeNull();
  });

  it('sin módulo nativo: lee null y guardar falla (nunca cae a texto plano)', async () => {
    delete (NativeModules as Record<string, unknown>).KioskDeviceModule;
    expect(await actual.loadDeviceSecret()).toBeNull();
    await expect(actual.saveDeviceSecret('abc')).rejects.toThrow(/almacén seguro/);
  });
});
