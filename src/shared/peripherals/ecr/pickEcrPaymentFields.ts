/**
 * Field-by-field extraction from raw POS USB text (Conviase-style `pickField`).
 * Tolerates partial / corrupted JSON without requiring a full JSON.parse.
 */

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

const FAIL_MSG = /FAIL|RECHAZ|CANCEL|DECLINED|ERROR/i;

/**
 * Conviase multi-field approval when enough structured fields are present.
 * Returns null when fields are too sparse/corrupt — caller should use heuristics.
 */
export function evaluateEcrApprovalFromPickedFields(
  fields: EcrPickedFields,
  raw: string,
): { approved: boolean; status?: string; message?: string } | null {
  const hasStructured =
    fields.errorCode != null ||
    fields.responseCode != null ||
    fields.success != null ||
    fields.result != null ||
    fields.innerResult != null;

  if (!hasStructured) {
    return null;
  }

  const msgUpper = (fields.responseMessage ?? '').toUpperCase();
  const hasErrorMsg = FAIL_MSG.test(msgUpper);
  const codeField = fields.responseCode;
  const hasInvalidResponseCode =
    codeField != null && codeField !== '00' && codeField.toUpperCase() !== 'CANCELLED';

  const hasNonZeroResult = /"result"\s*:\s*(?!0\b)-?\d+/i.test(raw);
  const resultOk =
    fields.innerResult != null
      ? fields.innerResult === 0
      : fields.result != null
        ? fields.result === 0
        : !hasNonZeroResult;

  const positiveSignal =
    fields.success === 'true' ||
    codeField === '00' ||
    msgUpper.includes('APPROV');

  const isApproved =
    fields.errorCode === 0 &&
    resultOk &&
    !hasErrorMsg &&
    !hasInvalidResponseCode &&
    positiveSignal;

  if (isApproved) {
    return {
      approved: true,
      status: codeField === '00' ? '00' : undefined,
      message: fields.responseMessage ?? undefined,
    };
  }

  // Clear decline when structured fields disagree with approval.
  if (
    fields.errorCode != null &&
    fields.errorCode < 0
  ) {
    return {
      approved: false,
      message: fields.responseMessage ?? 'Transacción rechazada en terminal',
    };
  }

  if (codeField != null && codeField.toUpperCase() === 'CANCELLED') {
    return {
      approved: false,
      status: 'CANCELLED',
      message: fields.responseMessage ?? 'Operación cancelada en el punto de venta',
    };
  }

  if (hasInvalidResponseCode || hasErrorMsg || fields.success === 'false') {
    return {
      approved: false,
      status: codeField ?? undefined,
      message: fields.responseMessage ?? 'Transacción rechazada en terminal',
    };
  }

  // Structured but inconclusive (e.g. missing errorCode on corrupt USB) → heuristic path.
  return null;
}
