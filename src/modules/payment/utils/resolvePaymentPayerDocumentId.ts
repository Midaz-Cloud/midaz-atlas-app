import { normalizeDocumentId } from '@shared/api/kiosk';

/** Documento efectivo para métodos de pago (POS / pago móvil). */
export function resolvePaymentPayerDocumentId(
  payerDocumentId: string | null | undefined,
  billingDocumentId: string | null | undefined,
): string {
  const override = payerDocumentId?.trim();
  if (override) {
    return normalizeDocumentId(override);
  }
  const billing = billingDocumentId?.trim();
  if (billing) {
    return normalizeDocumentId(billing);
  }
  return '';
}
