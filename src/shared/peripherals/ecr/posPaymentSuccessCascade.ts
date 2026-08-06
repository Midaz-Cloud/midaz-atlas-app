/**
 * Payment approval cascade (OR / fallback) for USB POS payloads.
 *
 * Order: errorCode → result → RRN → responseMessage.
 * - Undeciphered (null/empty) → try next
 * - Deciphered + success → approved
 * - Deciphered + clear failure → rejected (do not fall through)
 */

export type PosPaymentSuccessFields = {
  errorCode?: number | string | null;
  result?: number | string | null;
  rrn?: string | null;
  responseMessage?: string | null;
};

export type PosPaymentCascadeMatch =
  | 'errorCode'
  | 'result'
  | 'rrn'
  | 'responseMessage';

export type PosPaymentCascadeResult =
  | { approved: true; matched: PosPaymentCascadeMatch }
  | { approved: false; matched?: PosPaymentCascadeMatch; reason?: string };

const FAIL_MSG = /FAIL|RECHAZ|CANCEL|DECLINED|ERROR/i;

/** Treats 0 / "0" / "00" as success zero. Returns null if value is not a usable number. */
export function normalizePosZero(value: number | string | null | undefined): boolean | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value === 0;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === '0' || trimmed === '00') {
    return true;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || !/^-?\d+$/.test(trimmed)) {
    return null;
  }
  return n === 0;
}

export function isApprovedResponseMessage(message: string | null | undefined): boolean {
  if (message == null || !message.trim()) {
    return false;
  }
  return message.trim().toUpperCase() === 'APPROVED';
}

export function evaluatePosPaymentSuccessCascade(
  fields: PosPaymentSuccessFields,
): PosPaymentCascadeResult {
  const errorZero = normalizePosZero(fields.errorCode);
  if (errorZero === true) {
    return { approved: true, matched: 'errorCode' };
  }
  if (errorZero === false) {
    return {
      approved: false,
      matched: 'errorCode',
      reason: 'errorCode no exitoso',
    };
  }

  const resultZero = normalizePosZero(fields.result);
  if (resultZero === true) {
    return { approved: true, matched: 'result' };
  }
  if (resultZero === false) {
    return {
      approved: false,
      matched: 'result',
      reason: 'result no exitoso',
    };
  }

  const rrn = fields.rrn?.trim();
  if (rrn) {
    return { approved: true, matched: 'rrn' };
  }

  const message = fields.responseMessage?.trim();
  if (message) {
    if (isApprovedResponseMessage(message)) {
      return { approved: true, matched: 'responseMessage' };
    }
    if (FAIL_MSG.test(message)) {
      return {
        approved: false,
        matched: 'responseMessage',
        reason: message,
      };
    }
    return {
      approved: false,
      matched: 'responseMessage',
      reason: message,
    };
  }

  return { approved: false, reason: 'Sin señales de éxito descifrables' };
}
