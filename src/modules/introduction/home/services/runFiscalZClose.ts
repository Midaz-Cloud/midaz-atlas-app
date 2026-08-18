import { isKioskDemoMode } from '@shared/config';
import type { KioskApiClient } from '@shared/api/kiosk/client';
import { KioskApiError } from '@shared/api/kiosk/errors';
import { shouldPrintFiscalZ } from '@shared/api/kiosk/utils/invoicingType';
import type { FiscalClient } from '@shared/peripherals/fiscal/FiscalClient';
import { FiscalServiceError } from '@shared/peripherals/fiscal/FiscalServiceError';
import { MockFiscalClient } from '@shared/peripherals/fiscal/MockFiscalClient';
import { toKioskZReportBody } from '@shared/peripherals/fiscal/parseFiscalZReportResponse';
import type { FiscalZReportData } from '@shared/peripherals/fiscal/types';

export type FiscalZCloseResult = {
  attempted: boolean;
  printed: boolean;
  persisted: boolean;
  warning?: string;
};

function isDuplicateZError(error: unknown): boolean {
  if (!(error instanceof KioskApiError) || error.statusCode !== 400) {
    return false;
  }
  return error.message.toLowerCase().includes('ya existe');
}

async function persistZReport(
  kiosk: KioskApiClient,
  data: FiscalZReportData,
): Promise<void> {
  const body = toKioskZReportBody(data);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await kiosk.submitZReport(body);
      return;
    } catch (error) {
      if (isDuplicateZError(error)) {
        return;
      }
      lastError = error;
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** First GET is delayed: I0Z returns as soon as the command is accepted, while the Z is still printing. */
const DEFAULT_U0Z_RETRY_DELAYS_MS = [2500, 4000, 8000, 8000];

async function readZAfterPrintFailure(
  fiscal: FiscalClient,
  delaysMs: number[],
): Promise<FiscalZReportData | null> {
  for (const delayMs of delaysMs) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    try {
      const read = await fiscal.readLastZReport();
      if (read.envelope.data) {
        return read.envelope.data;
      }
    } catch {
      // Printer still busy or USB glitch — retry without a second I0Z.
    }
  }
  return null;
}

/**
 * Tras confirmar el cierre POS: I0Z+U0Z y persistir en Midaz.
 * Nunca relanza hacia el caller: un fallo de Z no aborta ticket/Excel/mail.
 */
export async function runFiscalZClose(params: {
  effectiveInvoicingType?: string | null;
  fiscal: FiscalClient;
  kiosk: KioskApiClient;
  /** Test override — production waits between U0Z retries after I0Z. */
  u0zRetryDelaysMs?: number[];
}): Promise<FiscalZCloseResult> {
  if (!shouldPrintFiscalZ(params.effectiveInvoicingType)) {
    return { attempted: false, printed: false, persisted: false };
  }

  const fiscal = isKioskDemoMode ? new MockFiscalClient() : params.fiscal;
  const u0zRetryDelaysMs = params.u0zRetryDelaysMs ?? DEFAULT_U0Z_RETRY_DELAYS_MS;

  try {
    const printed = await fiscal.printZReport();
    const data = printed.envelope.data;
    if (!data) {
      return {
        attempted: true,
        printed: true,
        persisted: false,
        warning: printed.envelope.message ?? 'Z impreso, sin datos U0Z',
      };
    }
    await persistZReport(params.kiosk, data);
    return { attempted: true, printed: true, persisted: true };
  } catch (error) {
    const status = error instanceof FiscalServiceError ? error.httpStatus : undefined;
    if (status === 503) {
      return {
        attempted: true,
        printed: false,
        persisted: false,
        warning: error instanceof Error ? error.message : 'No se pudo imprimir el reporte Z',
      };
    }

    if (status === 500) {
      const data = await readZAfterPrintFailure(fiscal, u0zRetryDelaysMs);
      if (!data) {
        return {
          attempted: true,
          printed: true,
          persisted: false,
          warning: error instanceof Error ? error.message : 'Z impreso, no se pudo leer U0Z',
        };
      }
      try {
        await persistZReport(params.kiosk, data);
        return { attempted: true, printed: true, persisted: true };
      } catch (persistError) {
        return {
          attempted: true,
          printed: true,
          persisted: false,
          warning:
            persistError instanceof Error
              ? persistError.message
              : 'Z leído, no se pudo guardar en Midaz',
        };
      }
    }

    return {
      attempted: true,
      printed: false,
      persisted: false,
      warning: error instanceof Error ? error.message : 'Error al emitir reporte Z',
    };
  }
}
