import {
  normalizeEcrResponseCode,
  parseEcrPaymentJson,
} from '@shared/peripherals/ecr/parseEcrPaymentJson';

import type { KioskSettlementData, KioskSettlementRequest } from '../types';

function readString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function readBoolean(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

export function buildSettlementDataFromFlat(
  flat: Record<string, unknown>,
): KioskSettlementData {
  return {
    CreditBatchNo: readString(flat, 'CreditBatchNo', 'creditBatchNo'),
    DebitBatchNo: readString(flat, 'DebitBatchNo', 'debitBatchNo'),
    ExtraBatchNo: readString(flat, 'ExtraBatchNo', 'extraBatchNo'),
    totalCreditCardSale: readString(flat, 'totalCreditCardSale'),
    totalDebitCardSale: readString(flat, 'totalDebitCardSale'),
    totalExtraSale: readString(flat, 'totalExtraSale'),
    totalCreditCardRefund: readString(flat, 'totalCreditCardRefund'),
    totalDebitCardRefund: readString(flat, 'totalDebitCardRefund'),
    totalExtraRefund: readString(flat, 'totalExtraRefund'),
    totalVisaMasterDebitSale: readString(flat, 'totalVisaMasterDebitSale'),
    totalVisaMasterDebitRefund: readString(flat, 'totalVisaMasterDebitRefund'),
    responseCode: readString(flat, 'responseCode', 'responseCdode'),
    responseMessage: readString(flat, 'responseMessage', 'responseMesages'),
    terminalID: readString(flat, 'terminalID', 'terinalID', 'ermtilnaID'),
    merchantID: readString(flat, 'merchantID'),
    deviceSerial: readString(flat, 'deviceSerial', 'deviceSerail'),
    date: readString(flat, 'date'),
    time: readString(flat, 'time'),
    traceNumber: readString(flat, 'traceNumber', 'traeNumber'),
    referenceNumber: readString(flat, 'referenceNumber', 'reeferenceNumbr'),
  };
}

function isSettlementApproved(flat: Record<string, unknown>): boolean {
  const responseCode = readString(flat, 'responseCode', 'responseCdode');
  if (responseCode != null) {
    return normalizeEcrResponseCode(responseCode) === '00';
  }
  const rootSuccess = readBoolean(flat, 'success', 'succes', 'sccess');
  const dataSuccess = readBoolean(flat, 'success', 'succes');
  if (rootSuccess === true || dataSuccess === true) {
    return true;
  }
  const result = flat.result;
  if (typeof result === 'number' && result === 0) {
    return true;
  }
  return false;
}

function buildSettlementTimestamp(flat: Record<string, unknown>): string {
  const date = readString(flat, 'date');
  const time = readString(flat, 'time');
  if (date && time && /^\d{8}$/.test(date) && /^\d{6}$/.test(time)) {
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}.000Z`;
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

export type BuildSettlementFromEcrResult =
  | { ok: true; request: KioskSettlementRequest; flat: Record<string, unknown> }
  | { ok: false; message: string; request?: KioskSettlementRequest };

/**
 * Maps POS settlement USB payload for POST /kiosk/settlement
 * (gateway → notifications `/api/pos/settlements`).
 */
export function buildSettlementFromEcr(
  rawEcrResponse: string,
  options?: { posSerialFallback?: string | null },
): BuildSettlementFromEcrResult {
  const flat = parseEcrPaymentJson(rawEcrResponse);
  if (!flat) {
    const fallbackSerial = options?.posSerialFallback?.trim();
    return {
      ok: false,
      message: 'Respuesta del terminal no valida',
      request: {
        success: false,
        error: 'Respuesta del terminal no valida',
        timestamp: new Date().toISOString(),
        ...(fallbackSerial ? { posSerial: fallbackSerial } : {}),
      },
    };
  }

  const approved = isSettlementApproved(flat);
  const settlementData = buildSettlementDataFromFlat(flat);
  const deviceSerial = settlementData.deviceSerial ?? options?.posSerialFallback?.trim();
  const referenceNo = readString(flat, 'referenceNo');
  const settlementId =
    referenceNo ?? `SETTLEMENT-${Date.now()}`;
  const responseMessage =
    settlementData.responseMessage ??
    (approved ? 'APPROVED' : 'Settlement rejected');

  const request: KioskSettlementRequest = {
    settlementId,
    success: approved,
    timestamp: buildSettlementTimestamp(flat),
    ...(approved
      ? {
          settlementData: {
            ...settlementData,
            ...(deviceSerial ? { deviceSerial } : {}),
          },
        }
      : {
          error: responseMessage,
          ...(deviceSerial ? { posSerial: deviceSerial } : {}),
        }),
  };

  if (!approved) {
    return { ok: false, message: responseMessage, request };
  }

  if (!deviceSerial) {
    return {
      ok: false,
      message: 'Falta el serial del POS en la respuesta del terminal',
      request: {
        ...request,
        success: false,
        error: 'Falta el serial del POS en la respuesta del terminal',
        settlementData: undefined,
        posSerial: options?.posSerialFallback?.trim(),
      },
    };
  }

  return { ok: true, request, flat };
}

/**
 * Request to persist in Midaz. Uses the structured parse when it is approved;
 * otherwise the salvaged USB fields. Never posts a `success: false` stub —
 * those 404/400 and leave the cierre unsaved while the ticket still prints.
 */
export function toPersistableSettlementRequest(
  result: BuildSettlementFromEcrResult,
  salvaged?: { settlementData: KioskSettlementData; referenceNo?: string } | null,
): KioskSettlementRequest | undefined {
  if (result.ok && result.request.settlementData?.deviceSerial?.trim()) {
    return result.request;
  }

  const data = salvaged?.settlementData;
  const serial = data?.deviceSerial?.trim();
  if (!data || !serial) {
    return undefined;
  }

  return {
    settlementId:
      salvaged?.referenceNo ??
      data.referenceNumber ??
      `SETTLEMENT-${Date.now()}`,
    success: true,
    timestamp: new Date().toISOString(),
    posSerial: serial,
    settlementData: data,
  };
}
