import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSecureItem } from '../deviceSecretStorage';
import { clearAccessToken, loadAccessToken, loadAccessTokenRaw, saveAccessToken } from '../tokenStorage';

describe('tokenStorage → almacén seguro', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('el token de sesión ya no queda en AsyncStorage en claro', async () => {
    await saveAccessToken('jwt-123');
    expect(await AsyncStorage.getItem('@kiosk/accessToken')).toBeNull();
    expect(await loadSecureItem('@kiosk/accessToken')).toBe('jwt-123');
    expect(await loadAccessToken()).toBe('jwt-123');
    expect((await loadAccessTokenRaw())?.token).toBe('jwt-123');
  });

  it('migra un token viejo de AsyncStorage al almacén seguro y lo borra de ahí', async () => {
    await AsyncStorage.multiSet([
      ['@kiosk/accessToken', 'viejo'],
      ['@kiosk/accessTokenExpiresAt', String(Date.now() + 60_000)],
    ]);
    expect(await loadAccessToken()).toBe('viejo');
    expect(await AsyncStorage.getItem('@kiosk/accessToken')).toBeNull();
    expect(await loadSecureItem('@kiosk/accessToken')).toBe('viejo');
  });

  it('clearAccessToken borra token y vencimiento', async () => {
    await saveAccessToken('jwt-123');
    await clearAccessToken();
    expect(await loadAccessToken()).toBeNull();
    expect(await loadSecureItem('@kiosk/accessToken')).toBeNull();
  });
});
