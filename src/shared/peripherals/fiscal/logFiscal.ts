import { isVerboseKioskLogging } from '@shared/config/env';

const MAX_STRING_CHARS = 2000;

function isJestRuntime(): boolean {
  return process.env.JEST_WORKER_ID != null;
}

function previewValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= MAX_STRING_CHARS) {
      return value;
    }
    return `${value.slice(0, MAX_STRING_CHARS)}… (${value.length} chars)`;
  }
  return value;
}

/**
 * Fiscal HTTP traces for Metro / Android logcat (`ReactNativeJS`).
 * Gated by `isVerboseKioskLogging()` (dev builds, or `KIOSK_VERBOSE_LOGS=true` for
 * a diagnostic release) so a normal release APK stays silent — HkaApp connectivity
 * issues get diagnosed with a verbose build, not by logging on every kiosk always.
 * Uses `console.warn` so it survives `transform-remove-console` in production.
 * Skipped under Jest.
 */
export function logFiscal(label: string, payload?: unknown): void {
  if (isJestRuntime() || !isVerboseKioskLogging()) {
    return;
  }

  try {
    if (payload === undefined) {
      console.warn(`[Fiscal] ${label}`);
      return;
    }
    console.warn(`[Fiscal] ${label}`, previewValue(payload));
  } catch {
    console.warn(`[Fiscal] ${label}`, payload == null ? '' : String(payload));
  }
}
