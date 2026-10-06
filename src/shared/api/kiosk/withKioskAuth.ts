import { getKioskApiKey } from '@shared/config/api';
import { getKioskDeviceProfile } from '@shared/device';

import type { KioskApiClient } from './client';
import { KioskApiError } from './errors';
import { createKioskApiClient } from './factory';
import { loadAccessToken, saveAccessToken } from './tokenStorage';

let reloginInFlight: Promise<string | null> | null = null;

/**
 * POST /auth/kiosk/login con el serial del dispositivo y guarda el token nuevo.
 * Single-flight: varias llamadas simultáneas (checkout + worker de sync + catálogo)
 * comparten un solo login. Devuelve null si el login falla (sin lanzar).
 */
export function reloginKiosk(): Promise<string | null> {
  if (reloginInFlight) {
    return reloginInFlight;
  }
  reloginInFlight = (async () => {
    try {
      const device = await getKioskDeviceProfile();
      const login = await createKioskApiClient().login({
        serialNumber: device.serialNumber,
        apiKey: getKioskApiKey(),
      });
      await saveAccessToken(login.accessToken);
      return login.accessToken;
    } catch {
      return null;
    } finally {
      reloginInFlight = null;
    }
  })();
  return reloginInFlight;
}

/**
 * Ejecuta una llamada autenticada del kiosko. Si no hay token vigente (el TTL de
 * 24 h vence en cliente, sin refresh) o el backend responde 401, re-loguea una
 * vez y reintenta. Antes cada call-site hacía `loadAccessToken()` y, con el token
 * vencido, mandaba la petición sin Authorization.
 */
export async function withKioskAuth<T>(run: (client: KioskApiClient) => Promise<T>): Promise<T> {
  let token = await loadAccessToken();
  if (!token) {
    token = await reloginKiosk();
  }
  try {
    return await run(createKioskApiClient(token ?? undefined));
  } catch (error) {
    if (!KioskApiError.isAuthError(error)) {
      throw error;
    }
    const fresh = await reloginKiosk();
    if (!fresh) {
      throw error;
    }
    return run(createKioskApiClient(fresh));
  }
}

/** Solo tests. */
export function __resetKioskReauthForTests(): void {
  reloginInFlight = null;
}
