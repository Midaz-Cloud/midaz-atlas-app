import { createKioskApiClient } from '../factory';
import { loadAccessToken } from '../tokenStorage';
import type { ValidateMobilePaymentRequest, ValidateMobilePaymentResponse } from '../types';
import { normalizeDocumentId } from '../utils/documentId';
import { normalizeVenezuelaPhone } from '@shared/phone/venezuelaPhone';

export type BuildValidateMobilePaymentParams = {
  bankCode: string;
  reference: string;
  cedula: string;
  phone: string;
  amountVes?: number;
  fechaPago?: string;
};

function formatAmountVes(amount: number): string {
  return amount.toFixed(2);
}

function formatFechaPago(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildValidateMobilePaymentRequest(
  params: BuildValidateMobilePaymentParams,
): ValidateMobilePaymentRequest {
  const request: ValidateMobilePaymentRequest = {
    bankCode: params.bankCode.trim(),
    reference: params.reference.trim(),
    cedula: normalizeDocumentId(params.cedula),
    phone: normalizeVenezuelaPhone(params.phone),
  };
  if (params.amountVes != null && Number.isFinite(params.amountVes)) {
    request.amountVES = formatAmountVes(params.amountVes);
  }
  if (params.fechaPago?.trim()) {
    request.fechaPago = params.fechaPago.trim();
  } else {
    request.fechaPago = formatFechaPago(new Date());
  }
  return request;
}

export function isValidateMobilePaymentSuccess(
  response: ValidateMobilePaymentResponse,
): boolean {
  return response.success === true && response.status === '00';
}

export async function validateMobilePaymentWithApi(
  params: BuildValidateMobilePaymentParams,
): Promise<ValidateMobilePaymentResponse> {
  const token = await loadAccessToken();
  const client = createKioskApiClient(token ?? undefined);
  const request = buildValidateMobilePaymentRequest(params);
  return client.validateMobilePayment(request);
}
