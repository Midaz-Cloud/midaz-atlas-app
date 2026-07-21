import { parseEcrPaymentResponse } from './parseEcrPaymentResponse';

export function ecrErrorFromPaymentResponse(raw: string): Error | null {
  const parsed = parseEcrPaymentResponse(raw);
  if (parsed.approved) {
    return null;
  }
  const detail = parsed.message ?? parsed.status;
  return new Error(detail ? `Pago POS rechazado: ${detail}` : 'Pago POS rechazado');
}
