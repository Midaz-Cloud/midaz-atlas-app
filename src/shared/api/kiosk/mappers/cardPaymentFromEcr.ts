import type { CardPaymentPayload } from '@shared/kiosk-order/types';

import {
  normalizeEcrResponseCode,
  parseEcrPaymentJson,
} from '@shared/peripherals/ecr/parseEcrPaymentJson';
import { evaluatePosPaymentSuccessCascade } from '@shared/peripherals/ecr/posPaymentSuccessCascade';

import type { KioskPosResponse } from '../types';
import { logKioskCheckoutPayload } from '../logKioskCheckoutPayload';
import { saveLastPosSerial } from '../tokenStorage';
import { normalizeDocumentId } from '../utils/documentId';

export { parseEcrPaymentJson } from '@shared/peripherals/ecr/parseEcrPaymentJson';

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

function readAccountType(
  flat: Record<string, unknown>,
  paymentMethodId: 'pos' | 'credito',
): number {
  const raw = flat.accountType ?? flat.countaTcype;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return paymentMethodId === 'credito' ? 2 : 1;
}

function buildCardHolder(
  flat: Record<string, unknown>,
  customer: { firstName: string; lastName: string },
): string {
  const fromTerminal = readString(
    flat,
    'cardHolder',
    'cardholder',
    'holderName',
    'customerName',
  );
  if (fromTerminal) {
    return fromTerminal.toUpperCase();
  }
  const name = `${customer.firstName} ${customer.lastName}`.trim();
  return (name || 'TITULAR KIOSCO').toUpperCase();
}

function posReferenceFromFlat(flat: Record<string, unknown>): string {
  return (
    readString(flat, 'RRN', 'rrn', 'traceNumber', 'referenceNumber', 'referenceNo') ??
    'SIN-REFERENCIA'
  );
}

export type BuildPosPaymentFromEcrParams = {
  rawEcrResponse: string;
  customer: {
    documentId: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  /** Documento enviado al terminal y en `cedula` de la orden (puede diferir de facturación). */
  payerDocumentId: string;
  paymentMethodId?: 'pos' | 'credito';
  /** Céntimos enviados al POS — Conviase: preferir sobre amount corrupto del USB. */
  amountSentCents?: number;
  /** Salvage/replay of stored payloads: do not persist POS serial nor log as live checkout. */
  skipSideEffects?: boolean;
};

export type BuildPosPaymentFromEcrResult =
  | { ok: true; payload: CardPaymentPayload }
  | { ok: false; message: string };

function buildKioskPosResponse(
  flat: Record<string, unknown>,
  paymentMethodId: 'pos' | 'credito',
): KioskPosResponse | null {
  const realRrn = readString(flat, 'RRN', 'rrn');
  const responseMessage = readString(
    flat,
    'responseMessage',
    'responseMesages',
    'ensMessge',
    'respnseMoessage',
  );
  const errorCode = flat.errorCode;
  const result = flat.result;

  const cascade = evaluatePosPaymentSuccessCascade({
    errorCode:
      typeof errorCode === 'number' || typeof errorCode === 'string' ? errorCode : null,
    result: typeof result === 'number' || typeof result === 'string' ? result : null,
    rrn: realRrn,
    responseMessage,
  });
  if (!cascade.approved) {
    return null;
  }

  const responseCode = readString(
    flat,
    'responseCode',
    'responseCdode',
    'responCseode',
    'eresponseCoe',
    'responseCod"e',
    'dateseCode',
    'responseCoded',
    'rnsspoeCode',
    'rnnsspoeCode',
  );
  const normalizedCode =
    responseCode != null ? normalizeEcrResponseCode(responseCode) : undefined;

  let traceNumber = readString(flat, 'traceNumber');
  let referenceNumber = readString(flat, 'referenceNumber');
  let RRN = realRrn;
  // USB junk defense: the order payload always carries a digits-only amount.
  let amount = readString(flat, 'amount', 'amout')?.replace(/\D/g, '') || undefined;
  const referenceNo = readString(flat, 'referenceNo');

  // Best-effort identity fill AFTER cascade approval (does not invent a false yes).
  if (!traceNumber && referenceNumber) {
    traceNumber = referenceNumber;
  }
  if (!referenceNumber && traceNumber) {
    referenceNumber = traceNumber;
  }
  if (!RRN && referenceNo) {
    const digits = referenceNo.replace(/\D/g, '');
    if (digits.length >= 8) {
      RRN = digits.slice(-12).padStart(12, '0');
    }
  }
  if (!traceNumber && RRN) {
    traceNumber = RRN.replace(/\D/g, '').slice(-6).padStart(6, '0');
  }
  if (!referenceNumber && traceNumber) {
    referenceNumber = traceNumber;
  }
  if (!RRN) {
    RRN = '000000000000';
  }
  if (!traceNumber) {
    traceNumber = '000000';
  }
  if (!referenceNumber) {
    referenceNumber = traceNumber;
  }
  if (!amount) {
    amount = '0';
  }

  const terminalID =
    readString(flat, 'terminalID', 'ermtilnaID', 'termi:nalID', 'tinermalID') ?? '00000000';
  const deviceSerial =
    readString(flat, 'deviceSerial', 'deviceSerail', 'deviceSreia"l', 'd4eviceSreia"l') ??
    '00000000';
  const merchantID = readString(flat, 'merchantID') ?? '0000000000';
  const batchNum = readString(flat, 'batchNum') ?? '000001';

  return {
    responseCode: normalizedCode ?? '00',
    responseMessage: responseMessage ?? 'APPROVED',
    referenceNumber,
    traceNumber,
    RRN,
    terminalID,
    deviceSerial,
    merchantID,
    accountType: readAccountType(flat, paymentMethodId),
    batchNum,
    amount,
    ...(referenceNo ? { referenceNo } : {}),
  };
}

/**
 * Maps approved POS USB payload + kiosk customer to POST /kiosk/orders (UPDATE-7).
 */
export function buildPosPaymentFromEcr(
  params: BuildPosPaymentFromEcrParams,
): BuildPosPaymentFromEcrResult {
  const flat = parseEcrPaymentJson(params.rawEcrResponse, {
    amountSentCents: params.amountSentCents,
  });
  if (!flat) {
    return { ok: false, message: 'Respuesta del terminal no válida' };
  }

  // Prefer client-sent amount when USB value is missing, junk, or truncated vs what we charged.
  const usbAmountRaw = flat.amount == null ? '' : String(flat.amount);
  const usbDigits = usbAmountRaw.replace(/\D/g, '');
  if (params.amountSentCents != null && params.amountSentCents > 0) {
    const sent = String(params.amountSentCents);
    // Override on missing/junk/truncated USB amount — including junk whose digits
    // happen to equal what we sent (e.g. "2r695631" vs 2695631).
    if (
      !usbDigits ||
      usbDigits === sent ||
      sent.startsWith(usbDigits) ||
      usbDigits.length < sent.length
    ) {
      flat.amount = sent;
    }
  } else if (usbDigits !== usbAmountRaw) {
    // No client amount to trust — never let non-digit junk reach the backend.
    flat.amount = usbDigits || undefined;
  }

  const paymentMethodId = params.paymentMethodId ?? 'pos';
  const posResponse = buildKioskPosResponse(flat, paymentMethodId);
  if (!posResponse) {
    return {
      ok: false,
      message:
        readString(flat, 'responseMessage', 'responseMesages') ??
        'Transacción no aprobada en terminal',
    };
  }

  const cedula = normalizeDocumentId(params.payerDocumentId);
  const posReference = posReferenceFromFlat(flat);

  const payload: CardPaymentPayload = {
    posResponse,
    cardType: paymentMethodId === 'credito' ? 'credito' : 'debito',
    cedula,
    cardHolder: buildCardHolder(flat, params.customer),
    phone: params.customer.phone?.trim() || undefined,
    posReference,
  };
  if (!params.skipSideEffects) {
    logKioskCheckoutPayload('POS → order payment payload', payload);
    void saveLastPosSerial(posResponse.deviceSerial);
  }

  return { ok: true, payload };
}

/** @deprecated Use buildPosPaymentFromEcr */
export function buildCardPaymentPayloadFromEcr(
  params: BuildPosPaymentFromEcrParams,
): CardPaymentPayload {
  const result = buildPosPaymentFromEcr(params);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.payload;
}
