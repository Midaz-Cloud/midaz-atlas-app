import { logKioskCheckoutPayload } from '@shared/api/kiosk/logKioskCheckoutPayload';
import { shouldUseMockApi } from '@shared/config';
import {
  documentIdToEcrDocumentNumber,
  EcrDocumentNumberError,
  parseEcrPaymentResponse,
  resolvePosChargeAmountVes,
  toEcrTerminalAmount,
  type UseUsbECRReturn,
} from '@shared/peripherals/ecr';

export type ExecutePosCardPaymentParams = {
  ecr: UseUsbECRReturn;
  documentId: string;
  cartTotalVes: number;
};

export type ExecutePosCardPaymentFailureReason =
  | 'not_connected'
  | 'declined'
  | 'error';

export type ExecutePosCardPaymentResult =
  | { ok: true; rawResponse: string }
  | {
      ok: false;
      reason: ExecutePosCardPaymentFailureReason;
      message: string;
      /** Present when the terminal replied (e.g. decline) so callers can persist it. */
      rawResponse?: string;
    };

export async function executePosCardPayment(
  params: ExecutePosCardPaymentParams,
): Promise<ExecutePosCardPaymentResult> {
  const { ecr, documentId, cartTotalVes } = params;

  if (shouldUseMockApi()) {
    return { ok: true, rawResponse: JSON.stringify({ status: 'approved', mock: true }) };
  }

  let ecrDocument: string;
  try {
    ecrDocument = documentIdToEcrDocumentNumber(documentId);
  } catch (err) {
    const message =
      err instanceof EcrDocumentNumberError
        ? err.message
        : 'Documento del cliente inválido para el POS';
    return { ok: false, reason: 'error', message };
  }

  try {
    if (!ecr.isConnected) {
      await ecr.connect();
    }
    if (ecr.usesNativeUsb && !ecr.isConnected) {
      return {
        ok: false,
        reason: 'not_connected',
        message: 'Terminal POS no conectado',
      };
    }

    const chargeVes = resolvePosChargeAmountVes(cartTotalVes);
    logKioskCheckoutPayload('POS payment request', {
      documentNumber: ecrDocument,
      amountVes: chargeVes,
      terminalAmount: toEcrTerminalAmount(chargeVes),
    });
    const rawResponse = await ecr.performPayment(ecrDocument, chargeVes);
    logKioskCheckoutPayload('POS payment raw response', rawResponse);
    const { approved, message, status } = parseEcrPaymentResponse(rawResponse);
    logKioskCheckoutPayload('POS payment approval', { approved, status, message });

    if (!approved) {
      return {
        ok: false,
        reason: 'declined',
        message: message ?? 'Pago rechazado en el terminal',
        rawResponse,
      };
    }

    return { ok: true, rawResponse };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: 'error',
      message,
      ...(ecr.lastTransactionResponse
        ? { rawResponse: ecr.lastTransactionResponse }
        : {}),
    };
  }
}
