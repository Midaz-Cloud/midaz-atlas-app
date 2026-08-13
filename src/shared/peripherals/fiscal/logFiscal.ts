const MAX_STRING_CHARS = 6000;

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
 * Always on (including release APK) so HkaApp connectivity can be diagnosed on-device.
 * Skipped under Jest.
 */
export function logFiscal(label: string, payload?: unknown): void {
  if (isJestRuntime()) {
    return;
  }

  try {
    if (payload === undefined) {
      console.log(`[Fiscal] ${label}`);
      return;
    }
    console.log(`[Fiscal] ${label}`, previewValue(payload));
  } catch {
    console.log(`[Fiscal] ${label}`, payload == null ? '' : String(payload));
  }
}
