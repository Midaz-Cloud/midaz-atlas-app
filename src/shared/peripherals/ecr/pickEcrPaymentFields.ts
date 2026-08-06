/**
 * Field-by-field extraction from raw POS USB text (Conviase-style `pickField`).
 * Tolerates partial / corrupted JSON without requiring a full JSON.parse.
 */

import {
  evaluatePosPaymentSuccessCascade,
  type PosPaymentCascadeResult,
} from './posPaymentSuccessCascade';

export type EcrPickedFields = {
  success: string | null;
  result: number | null;
  innerResult: number | null;
  responseCode: string | null;
  responseMessage: string | null;
  errorCode: number | null;
  rrn: string | null;
  traceNumber: string | null;
  amount: string | null;
  referenceNumber: string | null;
};

function pickField(text: string, re: RegExp): string | null {
  return text.match(re)?.[1] ?? null;
}

function pickInt(text: string, re: RegExp): number | null {
  const raw = pickField(text, re);
  if (raw == null) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Pulls key POS fields via regex from a (possibly corrupted) USB payload. */
export function pickEcrPaymentFields(raw: string): EcrPickedFields {
  const text = raw.trim();

  const success = pickField(text, /"success"\s*:\s*(true|false)/i);

  const innerResult = pickInt(
    text,
    /"data"\s*:\s*\{[^}]*?"result"\s*:\s*(-?\d+)/i,
  );
  const result = pickInt(text, /"result"\s*:\s*(-?\d+)/);

  const responseCode = pickField(
    text,
    /"responseCode"\s*:\s*"([^"]+)"/i,
  );
  const responseMessage = pickField(
    text,
    /"responseMessage"\s*:\s*"([^"]+)"/i,
  );
  const errorCode = pickInt(text, /"errorCode"\s*:\s*(-?\d+)/i);
  const rrn = pickField(text, /"RRN"\s*:\s*"([^"]+)"/i);
  const traceNumber = pickField(text, /"traceNumber"\s*:\s*"([^"]+)"/i);
  const amount = pickField(text, /"amount"\s*:\s*"?(\d+)"?/i);
  const referenceNumber =
    pickField(text, /"referenceNumber"\s*:\s*"([^"]+)"/i) ??
    pickField(text, /"referenceNo"\s*:\s*"([^"]+)"/i);

  return {
    success,
    result,
    innerResult,
    responseCode,
    responseMessage,
    errorCode,
    rrn,
    traceNumber,
    amount,
    referenceNumber,
  };
}

function cascadeFromPicked(fields: EcrPickedFields): PosPaymentCascadeResult {
  return evaluatePosPaymentSuccessCascade({
    errorCode: fields.errorCode,
    result: fields.innerResult ?? fields.result,
    rrn: fields.rrn,
    responseMessage: fields.responseMessage,
  });
}

/**
 * Approval via success cascade when any of the 4 signals is readable.
 * Returns null when none of the cascade fields are present — caller may try other extractors.
 */
export function evaluateEcrApprovalFromPickedFields(
  fields: EcrPickedFields,
  _raw: string,
): { approved: boolean; status?: string; message?: string } | null {
  const hasCascadeInput =
    fields.errorCode != null ||
    fields.result != null ||
    fields.innerResult != null ||
    Boolean(fields.rrn?.trim()) ||
    Boolean(fields.responseMessage?.trim());

  if (!hasCascadeInput) {
    return null;
  }

  const cascade = cascadeFromPicked(fields);
  if (cascade.approved) {
    return {
      approved: true,
      status: fields.responseCode === '00' ? '00' : undefined,
      message: fields.responseMessage ?? undefined,
    };
  }

  const codeField = fields.responseCode;
  if (codeField != null && codeField.toUpperCase() === 'CANCELLED') {
    return {
      approved: false,
      status: 'CANCELLED',
      message: fields.responseMessage ?? 'Operación cancelada en el punto de venta',
    };
  }

  return {
    approved: false,
    status: codeField ?? undefined,
    message:
      ('reason' in cascade ? cascade.reason : undefined) ??
      fields.responseMessage ??
      'Transacción rechazada en terminal',
  };
}
