import type { CardPaymentPayload } from '@shared/kiosk-order/types';

import {
  normalizeEcrResponseCode,
  parseEcrPaymentJson,
} from '@shared/peripherals/ecr/parseEcrPaymentJson';

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
};

export type BuildPosPaymentFromEcrResult =
  | { ok: true; payload: CardPaymentPayload }
  | { ok: false; message: string };

function buildKioskPosResponse(
  flat: Record<string, unknown>,
  paymentMethodId: 'pos' | 'credito',
): KioskPosResponse | null {
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
  if (normalizedCode !== '00') {
    return null;
  }

  let traceNumber = readString(flat, 'traceNumber');
  let referenceNumber = readString(flat, 'referenceNumber');
  let RRN = readString(flat, 'RRN', 'rrn');
  const amount = readString(flat, 'amount', 'amout');
  const responseMessage =
    readString(flat, 'responseMessage', 'responseMesages', 'ensMessge', 'respnseMoessage') ??
    'APPROVED';
  const referenceNo = readString(flat, 'referenceNo');

  // Cross-fill identity when USB dropped one of the sibling refs (Conviase minimal contract).
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

  if (!traceNumber || !referenceNumber || !RRN || !amount) {
    return null;
  }

  const terminalID =
    readString(flat, 'terminalID', 'ermtilnaID', 'termi:nalID', 'tinermalID') ?? '00000000';
  const deviceSerial =
    readString(flat, 'deviceSerial', 'deviceSerail', 'deviceSreia"l', 'd4eviceSreia"l') ??
    '00000000';
  const merchantID = readString(flat, 'merchantID') ?? '0000000000';
  const batchNum = readString(flat, 'batchNum') ?? '000001';

  return {
    responseCode: normalizedCode,
    responseMessage,
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

  // Prefer client-sent amount when USB value is clearly truncated/corrupt vs what we charged.
  if (
    params.amountSentCents != null &&
    params.amountSentCents > 0 &&
    (flat.amount == null ||
      String(flat.amount).replace(/\D/g, '') !== String(params.amountSentCents))
  ) {
    const usbDigits = String(flat.amount ?? '').replace(/\D/g, '');
    const sent = String(params.amountSentCents);
    // Only override when USB amount is missing, non-numeric junk, or a truncated subset.
    if (
      !usbDigits ||
      sent.startsWith(usbDigits) ||
      usbDigits.length < sent.length
    ) {
      flat.amount = sent;
    }
  }

  const paymentMethodId = params.paymentMethodId ?? 'pos';
  const posResponse = buildKioskPosResponse(flat, paymentMethodId);
  if (!posResponse) {
    const code = readString(flat, 'responseCode', 'responseCdode');
    if (code && code !== '00') {
      return {
        ok: false,
        message:
          readString(flat, 'responseMessage', 'responseMesages') ??
          'Transacción no aprobada en terminal',
      };
    }
    return {
      ok: false,
      message: 'Faltan datos obligatorios en la respuesta del terminal',
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
  logKioskCheckoutPayload('POS → order payment payload', payload);

  void saveLastPosSerial(posResponse.deviceSerial);

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
