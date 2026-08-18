import { getFiscalServiceBaseUrl } from '@shared/config/fiscal';

import type { FiscalClient } from './FiscalClient';
import { FiscalServiceError } from './FiscalServiceError';
import { logFiscal } from './logFiscal';
import { parseFiscalEmitEnvelope } from './parseFiscalEmitResponse';
import { parseFiscalHealthEnvelope } from './parseFiscalHealthResponse';
import { parseFiscalZReportEnvelope } from './parseFiscalZReportResponse';
import type {
  EmitFiscalInvoiceRequest,
  EmitFiscalInvoiceResult,
  FiscalHealthOptions,
  FiscalHealthResult,
  FiscalZReportResult,
} from './types';

async function fiscalFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    logFiscal(`${init.method ?? 'GET'} ${url}`);
    return await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logFiscal('fetch failed', { url, detail });
    throw new FiscalServiceError(
      `No se pudo conectar al servicio fiscal (${getFiscalServiceBaseUrl()}): ${detail}. Verifique que HkaApp este abierta en este dispositivo.`,
    );
  }
}

async function readFiscalJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new FiscalServiceError(
      `Respuesta invalida del servicio fiscal (HTTP ${response.status})`,
      response.status,
    );
  }
}

export class HttpFiscalClient implements FiscalClient {
  constructor(private readonly baseUrl: string = getFiscalServiceBaseUrl()) {}

  async getHealth(options?: FiscalHealthOptions): Promise<FiscalHealthResult> {
    const query = options?.probeEnq ? '?probe=enq' : '';
    const url = `${this.baseUrl}/v1/health${query}`;
    const response = await fiscalFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await readFiscalJson(response);
    const envelope = parseFiscalHealthEnvelope(body);
    logFiscal('health response', {
      httpStatus: response.status,
      healthy: envelope.data?.healthy,
      message: envelope.message,
      error: envelope.error,
    });

    if (!response.ok && response.status !== 503) {
      throw new FiscalServiceError(
        envelope.error ?? envelope.message ?? `Fiscal health HTTP ${response.status}`,
        response.status,
      );
    }

    return { envelope, httpStatus: response.status };
  }

  async emitInvoice(request: EmitFiscalInvoiceRequest): Promise<EmitFiscalInvoiceResult> {
    const url = `${this.baseUrl}/v1/invoices/emit`;
    logFiscal('emit request', request);
    const response = await fiscalFetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const body = await readFiscalJson(response);
    const envelope = parseFiscalEmitEnvelope(body);
    logFiscal('emit response', {
      httpStatus: response.status,
      success: envelope.success,
      issuedInvoiceNumber: envelope.data?.issuedInvoiceNumber,
      message: envelope.message,
      error: envelope.error,
      validationErrors: envelope.data?.validationErrors,
    });

    if (!response.ok) {
      const validationHint = envelope.data?.validationErrors?.join('; ');
      throw new FiscalServiceError(
        validationHint ??
          envelope.error ??
          envelope.message ??
          `Fiscal emit HTTP ${response.status}`,
        response.status,
      );
    }

    return { envelope, httpStatus: response.status };
  }

  async printZReport(): Promise<FiscalZReportResult> {
    return this.fetchZReport('POST', `${this.baseUrl}/v1/reports/z`);
  }

  async readLastZReport(): Promise<FiscalZReportResult> {
    return this.fetchZReport('GET', `${this.baseUrl}/v1/reports/z`);
  }

  private async fetchZReport(
    method: 'GET' | 'POST',
    url: string,
  ): Promise<FiscalZReportResult> {
    logFiscal(`${method} ${url}`);
    const response = await fiscalFetch(url, {
      method,
      headers: { Accept: 'application/json' },
    });
    const body = await readFiscalJson(response);
    const envelope = parseFiscalZReportEnvelope(body);
    logFiscal('z report response', {
      method,
      httpStatus: response.status,
      success: envelope.success,
      coo: envelope.data?.coo,
      message: envelope.message,
      error: envelope.error,
    });

    if (!response.ok) {
      throw new FiscalServiceError(
        envelope.error ?? envelope.message ?? `Fiscal Z HTTP ${response.status}`,
        response.status,
      );
    }

    if (!envelope.data) {
      throw new FiscalServiceError(
        envelope.message ?? 'Respuesta Z sin datos de auditoría',
        response.status,
      );
    }

    return { envelope, httpStatus: response.status };
  }
}
