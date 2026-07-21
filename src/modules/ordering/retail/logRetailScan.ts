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

/** Logcat tag: ReactNativeJS — filter with `adb logcat -s ReactNativeJS:*` or `RetailScan`. */
export function logRetailScan(label: string, payload?: unknown): void {
  if (isJestRuntime()) {
    return;
  }

  if (payload === undefined) {
    console.log(`[RetailScan] ${label}`);
    return;
  }

  try {
    console.log(`[RetailScan] ${label}`, previewValue(payload));
  } catch {
    console.log(`[RetailScan] ${label}`, String(payload));
  }
}
