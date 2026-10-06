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
 * Traces checkout payloads in Metro / Android logcat (`ReactNativeJS`), similar to POS USB logs.
 * Gated by `isVerboseKioskLogging()` (see logFiscal.ts) and emitted via `console.warn`
 * so it survives `transform-remove-console` in release. Skipped under Jest.
 */
export function logKioskCheckoutPayload(label: string, payload: unknown): void {
  if (isJestRuntime() || !isVerboseKioskLogging()) {
    return;
  }

  try {
    console.warn(`[KioskCheckout] ${label}`, previewValue(payload));
  } catch {
    console.warn(`[KioskCheckout] ${label}`, String(payload));
  }
}
