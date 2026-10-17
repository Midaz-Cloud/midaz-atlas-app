import { NativeModules, Platform } from 'react-native';

/**
 * Almacén seguro nativo (AndroidKeyStore AES-GCM + SharedPreferences privadas),
 * implementado en `KioskDeviceModule.kt`. Guarda el secreto del equipo (vínculo
 * por equipo) y el token de sesión. NO usa AsyncStorage: sin módulo nativo, leer
 * da null y guardar falla, nunca se cae a texto plano.
 */
type SecureNativeModule = {
  setDeviceSecret(value: string): Promise<void>;
  getDeviceSecret(): Promise<string | null>;
  clearDeviceSecret(): Promise<void>;
  setSecureItem(key: string, value: string): Promise<void>;
  getSecureItem(key: string): Promise<string | null>;
  removeSecureItem(key: string): Promise<void>;
};

function nativeModule(): SecureNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  const mod = (NativeModules as { KioskDeviceModule?: Partial<SecureNativeModule> }).KioskDeviceModule;
  return mod?.setDeviceSecret && mod.getSecureItem ? (mod as SecureNativeModule) : null;
}

function requireNative(): SecureNativeModule {
  const mod = nativeModule();
  if (!mod) {
    throw new Error('El almacén seguro del equipo no está disponible.');
  }
  return mod;
}

export async function saveDeviceSecret(secret: string): Promise<void> {
  await requireNative().setDeviceSecret(secret);
}

export async function loadDeviceSecret(): Promise<string | null> {
  const value = await nativeModule()?.getDeviceSecret();
  return value ? value : null;
}

/** Solo para un borrado explícito de la configuración del equipo; el logout NO lo llama. */
export async function clearDeviceSecret(): Promise<void> {
  await nativeModule()?.clearDeviceSecret();
}

export async function saveSecureItem(key: string, value: string): Promise<void> {
  await requireNative().setSecureItem(key, value);
}

export async function loadSecureItem(key: string): Promise<string | null> {
  const value = await nativeModule()?.getSecureItem(key);
  return value ? value : null;
}

export async function removeSecureItem(key: string): Promise<void> {
  await nativeModule()?.removeSecureItem(key);
}
