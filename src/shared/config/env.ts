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

export function getEnvString(key: keyof typeof Config): string | undefined {
  const value = Config[key];
  return value === '' || value === undefined ? undefined : value;
}
