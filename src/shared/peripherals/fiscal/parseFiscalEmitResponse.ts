import { parseFiscalApiEnvelope } from './parseFiscalHealthResponse';
import type { EmitFiscalInvoiceData } from './types';

function readNumber(value: unknown, fallback = 0): number {
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

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function parseEmitFiscalInvoiceData(raw: unknown): EmitFiscalInvoiceData | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const validationErrors = readStringArray(data.validationErrors);

  if (validationErrors?.length) {
    return {
      issuedInvoiceNumber: readNumber(data.issuedInvoiceNumber),
      lastInvoiceNumber: readNumber(data.lastInvoiceNumber),
      expectedInvoiceNumber: readNumber(data.expectedInvoiceNumber),
      traceLog: readString(data.traceLog),
      validationErrors,
    };
  }

  return {
    issuedInvoiceNumber: readNumber(data.issuedInvoiceNumber),
    lastInvoiceNumber: readNumber(data.lastInvoiceNumber),
    expectedInvoiceNumber: readNumber(data.expectedInvoiceNumber),
    traceLog: readString(data.traceLog),
  };
}

export function parseFiscalEmitEnvelope(body: unknown) {
  return parseFiscalApiEnvelope(body, parseEmitFiscalInvoiceData);
}
