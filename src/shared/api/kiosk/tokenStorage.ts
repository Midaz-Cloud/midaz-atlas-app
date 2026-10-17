import AsyncStorage from '@react-native-async-storage/async-storage';

import { KIOSK_TOKEN_TTL_MS } from '@shared/config/api';
import { loadSecureItem, removeSecureItem, saveSecureItem } from './deviceSecretStorage';
import type { KioskConfigResponse } from './types';

const ACCESS_TOKEN_KEY = '@kiosk/accessToken';
const ACCESS_TOKEN_EXPIRES_KEY = '@kiosk/accessTokenExpiresAt';
const CONFIG_ETAG_KEY = '@kiosk/configEtag';
const CONFIG_BODY_KEY = '@kiosk/configBody';
const PRODUCTS_ETAG_KEY = '@kiosk/productsEtag';
const PRODUCTS_BODY_KEY = '@kiosk/productsBody';
const LAST_POS_SERIAL_KEY = '@kiosk/lastPosSerial';

/**
 * El token de sesión vive en el almacén seguro nativo (no AsyncStorage). Solo el
 * vencimiento, que no es secreto, sigue en AsyncStorage.
 */
export async function saveAccessToken(token: string): Promise<void> {
  const expiresAt = String(Date.now() + KIOSK_TOKEN_TTL_MS);
  await saveSecureItem(ACCESS_TOKEN_KEY, token);
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, expiresAt);
}

/** Lee el token seguro; si quedó uno viejo en AsyncStorage lo migra y lo borra de ahí. */
async function readStoredToken(): Promise<string | null> {
  const secure = await loadSecureItem(ACCESS_TOKEN_KEY);
  if (secure) {
    return secure;
  }
  const legacy = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!legacy) {
    return null;
  }
  try {
    await saveSecureItem(ACCESS_TOKEN_KEY, legacy);
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Sin almacén seguro se usa el token viejo tal cual hasta el próximo login.
  }
  return legacy;
}

export async function loadAccessToken(): Promise<string | null> {
  const token = await readStoredToken();
  if (!token) {
    return null;
  }
  const expiresAtRaw = await AsyncStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
  if (expiresAt && Date.now() >= expiresAt) {
    await clearAccessToken();
    return null;
  }
  return token;
}

/**
 * Token guardado aunque haya vencido (no lo borra). Sin red no se puede re-loguear
 * y el kiosko igual tiene que arrancar en modo offline con lo que tiene.
 */
export async function loadAccessTokenRaw(): Promise<{ token: string; expiresAt: number } | null> {
  const token = await readStoredToken();
  if (!token) {
    return null;
  }
  const expiresAtRaw = await AsyncStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);
  return { token, expiresAt: expiresAtRaw ? Number(expiresAtRaw) : 0 };
}

/** Borra la sesión. NO toca el `deviceSecret`: el vínculo del equipo sobrevive. */
export async function clearAccessToken(): Promise<void> {
  await removeSecureItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXPIRES_KEY]);
}

export async function saveConfigEtag(etag: string): Promise<void> {
  await AsyncStorage.setItem(CONFIG_ETAG_KEY, etag);
}

export async function loadConfigEtag(): Promise<string | null> {
  return AsyncStorage.getItem(CONFIG_ETAG_KEY);
}

/** Persists the live GET /kiosk/config JSON body (not the mapped app shape). */
export async function saveCachedConfigBody(body: unknown): Promise<void> {
  await AsyncStorage.setItem(CONFIG_BODY_KEY, JSON.stringify(body));
}

export async function loadCachedConfigBody(): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(CONFIG_BODY_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Drops cached kiosk config + ETag (e.g. after switching from mock to live API). */
export async function clearCachedKioskConfig(): Promise<void> {
  await AsyncStorage.multiRemove([CONFIG_ETAG_KEY, CONFIG_BODY_KEY]);
}

export async function saveProductsEtag(etag: string): Promise<void> {
  await AsyncStorage.setItem(PRODUCTS_ETAG_KEY, etag);
}

export async function loadProductsEtag(): Promise<string | null> {
  return AsyncStorage.getItem(PRODUCTS_ETAG_KEY);
}

/** Persists the live GET /kiosk/products JSON body (not the mapped app shape). */
export async function saveCachedProductsBody(body: unknown): Promise<void> {
  await AsyncStorage.setItem(PRODUCTS_BODY_KEY, JSON.stringify(body));
}

export async function loadCachedProductsBody(): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(PRODUCTS_BODY_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function clearCachedKioskProducts(): Promise<void> {
  await AsyncStorage.multiRemove([PRODUCTS_ETAG_KEY, PRODUCTS_BODY_KEY]);
}

export async function saveLastPosSerial(serial: string): Promise<void> {
  const trimmed = serial.trim();
  if (!trimmed) {
    return;
  }
  await AsyncStorage.setItem(LAST_POS_SERIAL_KEY, trimmed);
}

export async function loadLastPosSerial(): Promise<string | null> {
  const serial = await AsyncStorage.getItem(LAST_POS_SERIAL_KEY);
  return serial?.trim() || null;
}

const MOCK_CONFIG_ID = 'mock-config-id';

export function isMockKioskConfig(config: KioskConfigResponse): boolean {
  return config.id === MOCK_CONFIG_ID || config.kioskDeviceId === 'mock-device-id';
}
