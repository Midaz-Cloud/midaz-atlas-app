import { formatSettlementAmount } from '@shared/peripherals/printer/formatSettlementTicketText';
import type { CardPaymentPayload } from '@shared/kiosk-order/types';

import type { SuccessfulPosTransactionInput } from './types';

/**
 * Best-effort extract of POS date/time from corrupted or clean ECR JSON.
 */
export function extractPosDateTimeFromRaw(rawJson: string | null | undefined): string | null {
  if (!rawJson) {
    return null;
  }
  const dateMatch = rawJson.match(/"date"\s*:\s*"(\d{8}|\d{4}-\d{2}-\d{2})"/i);
  const timeMatch = rawJson.match(/"time"\s*:\s*"(\d{6}|\d{2}:\d{2}:\d{2})"/i);
  const date = dateMatch?.[1];
  const time = timeMatch?.[1];
  if (!date && !time) {
    return null;
  }

  let datePart = date ?? '';
  if (/^\d{8}$/.test(datePart)) {
    datePart = `${datePart.slice(6, 8)}/${datePart.slice(4, 6)}/${datePart.slice(0, 4)}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-');
    datePart = `${d}/${m}/${y}`;
  }

  let timePart = time ?? '';
  if (/^\d{6}$/.test(timePart)) {
    timePart = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`;
  }

  return [datePart, timePart].filter(Boolean).join(' ') || null;
}

export function buildSuccessfulPosTransactionInput(params: {
  payload: CardPaymentPayload;
  rawJson?: string | null;
}): SuccessfulPosTransactionInput {
  const { posResponse, posReference, cardType } = params.payload;
  const amount = String(posResponse.amount ?? '');
  return {
    posReference: posReference || posResponse.RRN || posResponse.traceNumber || 'SIN-REF',
    rrn: posResponse.RRN,
    traceNumber: posResponse.traceNumber,
    amount,
    amountDisplay: formatSettlementAmount(amount),
    deviceSerial: posResponse.deviceSerial,
    batchNum: posResponse.batchNum,
    cardType,
    rawJson: params.rawJson ?? null,
    posDateTime: extractPosDateTimeFromRaw(params.rawJson),
  };
}

/** Formats ISO created_at for thermal ticket. */
export function formatSuccessfulPosTicketDateTime(
  createdAt: string,
  posDateTime?: string | null,
): string {
  if (posDateTime?.trim()) {
    return posDateTime.trim();
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}
