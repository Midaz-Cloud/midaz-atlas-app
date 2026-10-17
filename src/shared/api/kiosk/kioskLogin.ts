import type { KioskApiClient } from './client';
import { loadDeviceSecret, saveDeviceSecret } from './deviceSecretStorage';
import { DEVICE_REBIND_MESSAGE, KioskApiError } from './errors';
import type { KioskLoginResponse } from './types';

type LoginCredentials = { serialNumber: string; apiKey: string };

async function loginOnce(
  client: KioskApiClient,
  credentials: LoginCredentials,
  deviceSecret: string | null,
): Promise<KioskLoginResponse> {
  try {
    return await client.login({
      ...credentials,
      bindingCapable: true,
      ...(deviceSecret ? { deviceSecret } : {}),
    });
  } catch (error) {
    if (KioskApiError.isDeviceBindingError(error)) {
      const { body, statusCode } = error as KioskApiError;
      // Mensaje claro para el operador; sin reintentos.
      throw new KioskApiError(DEVICE_REBIND_MESSAGE, statusCode, body);
    }
    throw error;
  }
}

/**
 * POST /auth/kiosk/login con vínculo por equipo: envía el `deviceSecret` guardado;
 * si el servidor emite uno nuevo lo guarda en el almacén seguro y hace de
 * inmediato un segundo login idéntico que lo envía (confirmación).
 */
export async function loginKioskWithBinding(
  client: KioskApiClient,
  credentials: LoginCredentials,
): Promise<KioskLoginResponse> {
  const first = await loginOnce(client, credentials, await loadDeviceSecret());
  const issued = first.deviceBinding?.deviceSecret;
  if (!issued) {
    return first;
  }
  try {
    await saveDeviceSecret(issued);
  } catch {
    // Sin almacén seguro no hay vínculo posible: se sigue con este login y el
    // servidor volverá a emitir el secreto en el próximo (nunca se guarda en claro).
    return first;
  }
  return loginOnce(client, credentials, issued);
}
