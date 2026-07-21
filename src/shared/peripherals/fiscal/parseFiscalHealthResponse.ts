import type { FiscalApiEnvelope, FiscalHealthData } from './types';

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback = -1): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  return value == null ? null : String(value);
}

function parseFiscalHealthData(raw: unknown): FiscalHealthData | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  return {
    healthy: readBoolean(data.healthy),
    serviceRunning: readBoolean(data.serviceRunning),
    usbConnected: readBoolean(data.usbConnected),
    transport: readStringOrNull(data.transport),
    printerStatusCode: readNumber(data.printerStatusCode, -1),
    printerReady: readBoolean(data.printerReady),
    enqOk: readBoolean(data.enqOk),
  };
}

/** Parses HkaApp fiscal API envelope from JSON body. */
export function parseFiscalApiEnvelope<T>(
  body: unknown,
  parseData: (raw: unknown) => T | null,
): FiscalApiEnvelope<T> {
  const raw = body != null && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  return {
    success: readBoolean(raw.success),
    apiVersion: typeof raw.apiVersion === 'string' ? raw.apiVersion : '1',
    serviceVersion: typeof raw.serviceVersion === 'string' ? raw.serviceVersion : 'unknown',
    data: parseData(raw.data),
    message: readStringOrNull(raw.message),
    error: readStringOrNull(raw.error),
  };
}

export function parseFiscalHealthEnvelope(body: unknown): FiscalApiEnvelope<FiscalHealthData> {
  return parseFiscalApiEnvelope(body, parseFiscalHealthData);
}
