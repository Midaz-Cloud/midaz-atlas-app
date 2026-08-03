import {
  extractEcrErrorCodeFromText,
  extractEcrResponseCodeFromText,
} from '@shared/peripherals/ecr/parseEcrPaymentJson';
import {
  fuzzyExtractReferenceNo,
  fuzzyExtractResponseCode,
  fuzzyExtractTraceNumber,
} from '@shared/peripherals/ecr/fuzzyEcrFieldExtract';

import type { KioskSettlementData } from '../types';

/**
 * Settlement-only plain-text approval when USB JSON cannot be structured-parsed.
 * Does not change payment parse paths.
 */
export function isSettlementApprovedPlainText(raw: string): boolean {
  const text = raw.trim();
  if (!text) {
    return false;
  }

  const errorCode = extractEcrErrorCodeFromText(text);
  if (errorCode != null && errorCode < 0) {
    return false;
  }

  const responseCode =
    fuzzyExtractResponseCode(text) ?? extractEcrResponseCodeFromText(text);
  if (responseCode === '00') {
    return true;
  }
  if (errorCode === 0 && /APPROV/i.test(text)) {
    return true;
  }
  if (
    /settlement/i.test(text) &&
    /APPROVED/i.test(text) &&
    (errorCode === 0 || /success"?\s*:\s*true/i.test(text))
  ) {
    return true;
  }
  return false;
}

function quotedField(raw: string, keyPattern: string): string | undefined {
  const re = new RegExp(`${keyPattern}"\\s*:\\s*"([^"]*)"`, 'i');
  const value = raw.match(re)?.[1]?.trim();
  return value || undefined;
}

function quotedAmountField(raw: string, keyPattern: string): string | undefined {
  const value = quotedField(raw, keyPattern);
  if (value == null) {
    return undefined;
  }
  // Prefer pure digit / decimal tokens from corrupted amounts.
  const digits = value.replace(/[^\d.]/g, '');
  return digits || undefined;
}

export function extractSettlementReferenceFromRaw(raw: string): string | undefined {
  return (
    fuzzyExtractReferenceNo(raw) ??
    raw.match(/(REF-\d{10,})/i)?.[1]?.trim()
  );
}

export function extractDeviceSerialFromRaw(raw: string): string | undefined {
  const serial = quotedField(raw, 'deviceSer(?:ial|ail)');
  if (serial && serial.length >= 6) {
    return serial.replace(/[^0-9A-Za-z]/g, '') || serial;
  }
  return undefined;
}

/**
 * Best-effort settlement fields for printing when structured JSON parse fails.
 * Only used by cierre de lote print path — not payment checkout.
 */
export function salvageSettlementDataForPrint(
  raw: string,
  options?: { posSerialFallback?: string | null },
): {
  settlementData: KioskSettlementData;
  referenceNo?: string;
} {
  const deviceSerial =
    extractDeviceSerialFromRaw(raw) ?? options?.posSerialFallback?.trim() ?? undefined;
  const responseCode =
    fuzzyExtractResponseCode(raw) ?? extractEcrResponseCodeFromText(raw) ?? '00';

  const settlementData: KioskSettlementData = {
    responseCode,
    responseMessage: /APPROV/i.test(raw) ? 'APPROVED' : undefined,
    CreditBatchNo: quotedField(raw, 'CreditBatchNo'),
    DebitBatchNo: quotedField(raw, 'DebitBatchNo'),
    ExtraBatchNo: quotedField(raw, 'ExtraBatchNo'),
    totalCreditCardSale: quotedAmountField(raw, 'totalCreditCardSale'),
    totalDebitCardSale: quotedAmountField(raw, 'totalDebitCardSale'),
    totalExtraSale: quotedAmountField(raw, 'totalExtraSale'),
    totalCreditCardRefund: quotedAmountField(raw, 'totalCreditCardRefund'),
    totalDebitCardRefund: quotedAmountField(raw, 'totalDebitCardRefund'),
    totalExtraRefund: quotedAmountField(raw, 'totalExtraRefund'),
    terminalID: quotedField(raw, 'terminalID'),
    merchantID: quotedField(raw, 'merchantID'),
    deviceSerial,
    date: quotedField(raw, 'date'),
    time: quotedField(raw, 'time'),
    traceNumber: fuzzyExtractTraceNumber(raw) ?? quotedField(raw, 'traceNumber'),
    referenceNumber: quotedField(raw, 'referenceNumber'),
  };

  return {
    settlementData,
    referenceNo: extractSettlementReferenceFromRaw(raw),
  };
}
