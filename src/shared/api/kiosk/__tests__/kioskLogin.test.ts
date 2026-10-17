import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEVICE_REBIND_MESSAGE, KioskApiError } from '../errors';
import { loadDeviceSecret, saveDeviceSecret } from '../deviceSecretStorage';
import { loginKioskWithBinding } from '../kioskLogin';
import { clearAccessToken, loadAccessToken, saveAccessToken } from '../tokenStorage';
import type { KioskApiClient } from '../client';
import type { KioskDeviceBindingState, KioskLoginRequest, KioskLoginResponse } from '../types';

const credentials = { serialNumber: 'AF910S1', apiKey: 'k' };

function clientWith(
  ...responses: Array<KioskLoginResponse | Error>
): { client: KioskApiClient; login: jest.Mock<Promise<KioskLoginResponse>, [KioskLoginRequest]> } {
  const login = jest.fn<Promise<KioskLoginResponse>, [KioskLoginRequest]>();
  responses.forEach((r) => {
    if (r instanceof Error) {
      login.mockRejectedValueOnce(r);
    } else {
      login.mockResolvedValueOnce(r);
    }
  });
  return { client: { login } as unknown as KioskApiClient, login };
}

const bindingError = (code: string) =>
  new KioskApiError('x', 401, { statusCode: 401, message: 'x', code });

describe('loginKioskWithBinding', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('declara bindingCapable y no manda secreto si no hay uno guardado', async () => {
    const { client, login } = clientWith({ accessToken: 't1', deviceBinding: { state: 'unbound' } });
    const res = await loginKioskWithBinding(client, credentials);
    expect(res.accessToken).toBe('t1');
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ ...credentials, bindingCapable: true });
    expect(await loadDeviceSecret()).toBeNull();
  });

  it('guarda el secreto emitido y confirma de inmediato con un segundo login', async () => {
    const { client, login } = clientWith(
      { accessToken: 't1', deviceBinding: { state: 'pending', deviceSecret: 's3cr3t' } },
      { accessToken: 't2', deviceBinding: { state: 'enrolled' } },
    );
    const res = await loginKioskWithBinding(client, credentials);
    expect(login).toHaveBeenCalledTimes(2);
    expect(login).toHaveBeenNthCalledWith(1, { ...credentials, bindingCapable: true });
    expect(login).toHaveBeenNthCalledWith(2, { ...credentials, bindingCapable: true, deviceSecret: 's3cr3t' });
    expect(await loadDeviceSecret()).toBe('s3cr3t');
    expect(res.accessToken).toBe('t2');
    expect(res.deviceBinding?.state).toBe('enrolled');
  });

  it('el secreto no pasa por AsyncStorage', async () => {
    const { client } = clientWith(
      { accessToken: 't1', deviceBinding: { state: 'pending', deviceSecret: 's3cr3t' } },
      { accessToken: 't2', deviceBinding: { state: 'enrolled' } },
    );
    await loginKioskWithBinding(client, credentials);
    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    expect(JSON.stringify(values)).not.toContain('s3cr3t');
  });

  it('todo login posterior envía el secreto guardado', async () => {
    await saveDeviceSecret('guardado');
    const { client, login } = clientWith({ accessToken: 't', deviceBinding: { state: 'enrolled' } });
    await loginKioskWithBinding(client, credentials);
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ ...credentials, bindingCapable: true, deviceSecret: 'guardado' });
  });

  it('cerrar la sesión (borrar el token) no borra el secreto', async () => {
    await saveDeviceSecret('guardado');
    await saveAccessToken('tok');
    await clearAccessToken();
    expect(await loadAccessToken()).toBeNull();
    expect(await loadDeviceSecret()).toBe('guardado');
  });

  it.each(['DEVICE_SECRET_REQUIRED', 'DEVICE_SECRET_INVALID', 'DEVICE_NOT_ENROLLED'])(
    '%s da el mensaje de re-vínculo y no reintenta',
    async (code) => {
      const { client, login } = clientWith(bindingError(code));
      const error = await loginKioskWithBinding(client, credentials).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(KioskApiError);
      expect((error as KioskApiError).message).toBe(DEVICE_REBIND_MESSAGE);
      expect(KioskApiError.isDeviceBindingError(error)).toBe(true);
      expect(login).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['off', 'estado-nuevo'])('el estado %s se sigue normal: un login, sin secreto ni bucle', async (state) => {
    const { client, login } = clientWith({
      accessToken: 't',
      deviceBinding: { state: state as KioskDeviceBindingState },
    });
    const res = await loginKioskWithBinding(client, credentials);
    expect(res.accessToken).toBe('t');
    expect(login).toHaveBeenCalledTimes(1);
    expect(await loadDeviceSecret()).toBeNull();
  });

  it('unverified no borra el secreto guardado ni re-enrola', async () => {
    await saveDeviceSecret('guardado');
    const { client, login } = clientWith({ accessToken: 't', deviceBinding: { state: 'unverified' } });
    const res = await loginKioskWithBinding(client, credentials);
    expect(res.accessToken).toBe('t');
    expect(login).toHaveBeenCalledTimes(1);
    expect(await loadDeviceSecret()).toBe('guardado');
  });

  it('la confirmación corta tras UN reintento aunque no diga enrolled', async () => {
    const { client, login } = clientWith(
      { accessToken: 't1', deviceBinding: { state: 'pending', deviceSecret: 's1' } },
      { accessToken: 't2', deviceBinding: { state: 'unverified', deviceSecret: 's2' } },
    );
    const res = await loginKioskWithBinding(client, credentials);
    expect(res.accessToken).toBe('t2');
    expect(login).toHaveBeenCalledTimes(2);
    expect(await loadDeviceSecret()).toBe('s1');
  });

  it('si la confirmación es rechazada, el secreto sigue guardado y el error se propaga una vez', async () => {
    const { client, login } = clientWith(
      { accessToken: 't1', deviceBinding: { state: 'pending', deviceSecret: 's3cr3t' } },
      bindingError('DEVICE_SECRET_INVALID'),
    );
    await expect(loginKioskWithBinding(client, credentials)).rejects.toThrow(DEVICE_REBIND_MESSAGE);
    expect(login).toHaveBeenCalledTimes(2);
    expect(await loadDeviceSecret()).toBe('s3cr3t');
  });

  it('otros errores 401 pasan intactos', async () => {
    const plain = new KioskApiError('API key inválida', 401, { statusCode: 401, message: 'API key inválida' });
    const { client } = clientWith(plain);
    await expect(loginKioskWithBinding(client, credentials)).rejects.toBe(plain);
  });
});
