import { isVerboseKioskLogging } from '@shared/config/env';

const MAX_STRING_CHARS = 500;

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
 * Logcat tag: ReactNativeJS — filter with `adb logcat -s ReactNativeJS:*` or `RetailScan`.
 * Gated by `isVerboseKioskLogging()` (see logFiscal.ts); `console.warn` survives
 * `transform-remove-console` in release. Skipped under Jest.
 */
export function logRetailScan(label: string, payload?: unknown): void {
  if (isJestRuntime() || !isVerboseKioskLogging()) {
    return;
  }

  if (payload === undefined) {
    console.warn(`[RetailScan] ${label}`);
    return;
  }

  try {
    console.warn(`[RetailScan] ${label}`, previewValue(payload));
  } catch {
    console.warn(`[RetailScan] ${label}`, String(payload));
  }
}
