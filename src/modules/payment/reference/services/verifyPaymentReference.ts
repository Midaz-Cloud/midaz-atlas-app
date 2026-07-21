import {
  getDemoReferenceCode,
  getDemoReferenceVerifyDelayMs,
  getDemoReferenceVerifyTimeoutMs,
} from '@shared/config';

export type VerifyReferenceResult = 'ok' | 'not_found' | 'timeout';

export type VerifyPaymentReferenceParams = {
  methodId: 'mobile' | 'zelle';
  suffix: string;
  orderTotalUsd: number;
};

/**
 * Valida los últimos 6 dígitos de referencia.
 * Mock Fase 1: código válido desde config (demo: env; siempre `123456` por defecto).
 * TODO: sustituir por `resolvePaymentReference` cuando exista API.
 */
export async function verifyPaymentReference(
  params: VerifyPaymentReferenceParams,
): Promise<VerifyReferenceResult> {
  const { suffix } = params;
  const validSuffix = getDemoReferenceCode();
  const verifyTimeoutMs = getDemoReferenceVerifyTimeoutMs();
  const mockDelayMs = getDemoReferenceVerifyDelayMs();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: VerifyReferenceResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => finish('timeout'), verifyTimeoutMs);

    void (async () => {
      await delay(mockDelayMs);
      clearTimeout(timer);
      finish(suffix === validSuffix ? 'ok' : 'not_found');
    })();
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
