import Config from 'react-native-config';

/** Parses env booleans: only literal `true` is true. */
export function parseBooleanEnv(value: string | undefined): boolean {
  return value === 'true';
}

export const isKioskDemoMode = parseBooleanEnv(Config.KIOSK_DEMO_MODE);

/** On-screen dev overlays and home test tools (Metro debug only, not release APK). */
export function showKioskDevUi(): boolean {
  return __DEV__;
}

/**
 * Logs de diagnóstico (factura fiscal, checkout, escaneo, caché de imágenes) en
 * release: normalmente silenciados por `transform-remove-console` (babel.config.js)
 * y por los early-return de cada helper. Activar `KIOSK_VERBOSE_LOGS=true` en el
 * `.env` de un build de diagnóstico para volver a verlos por logcat sin pasar a
 * debug con Metro. Requiere reinstalar el APK (env var, no JS).
 */
export function isVerboseKioskLogging(): boolean {
  return __DEV__ || parseBooleanEnv(Config.KIOSK_VERBOSE_LOGS);
}

export function getEnvString(key: keyof typeof Config): string | undefined {
  const value = Config[key];
  return value === '' || value === undefined ? undefined : value;
}
