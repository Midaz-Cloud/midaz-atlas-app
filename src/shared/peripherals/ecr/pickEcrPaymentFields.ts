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

/**
 * Extracts the substring of a top-level `"key": { ... }` object value, walking
 * brace depth from the opening `{`. Returns null if the key/object isn't found
 * or the braces never balance (corrupted transport — caller falls back to raw text).
 */
function extractJsonObjectValue(text: string, key: string): string | null {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\{`));
  if (match?.index == null) {
    return null;
  }
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') {
      depth += 1;
    } else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Pulls key POS fields via regex from a (possibly corrupted) USB payload.
 *
 * PKUSB wraps the real outcome in a `data` object; the outer envelope's own
 * `success`/`result` only mean "PKUSB produced a response", not "the payment
 * was approved" (that outer `result` is always `0`, even on a decline). Scan
 * inside `data` for the outcome signals when it's present and well-formed;
 * fall back to the whole text when it isn't (older/corrupted payloads without
 * that wrapper). See incident 2026-08-31: a declined payment (`data.success:
 * false`) was read as approved because the outer envelope's `result:0` was
 * picked up instead.
 */
export function pickEcrPaymentFields(raw: string): EcrPickedFields {
  const text = raw.trim();
  const dataText = extractJsonObjectValue(text, 'data') ?? text;

  const success = pickField(dataText, /"success"\s*:\s*(true|false)/i);

  const innerResult = pickInt(
    text,
    /"data"\s*:\s*\{[^}]*?"result"\s*:\s*(-?\d+)/i,
  );
  const result = pickInt(dataText, /"result"\s*:\s*(-?\d+)/);

  const responseCode = pickField(
    dataText,
    /"responseCode"\s*:\s*"([^"]+)"/i,
  );
  const responseMessage = pickField(
    dataText,
    /"responseMessage"\s*:\s*"([^"]+)"/i,
  );
  const errorCode = pickInt(dataText, /"errorCode"\s*:\s*(-?\d+)/i);
  const rrn = pickField(dataText, /"RRN"\s*:\s*"([^"]+)"/i);
  const traceNumber = pickField(dataText, /"traceNumber"\s*:\s*"([^"]+)"/i);
  const amount = pickField(dataText, /"amount"\s*:\s*"?(\d+)"?/i);
  const referenceNumber =
    pickField(dataText, /"referenceNumber"\s*:\s*"([^"]+)"/i) ??
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
