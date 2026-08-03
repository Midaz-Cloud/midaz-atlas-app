import type { KioskSettlementData } from '@shared/api/kiosk/types';

function readLine(label: string, value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return `${label}: ${value.trim()}`;
}

/** Formats POS settlement amounts for thermal ticket display. */
export function formatSettlementAmount(raw: string | undefined): string {
  if (raw == null || raw.trim() === '') {
    return '0.00';
  }
  const trimmed = raw.trim();
  if (trimmed.includes('.')) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : trimmed;
  }
  const cents = Number.parseInt(trimmed, 10);
  if (Number.isFinite(cents)) {
    return (cents / 100).toFixed(2);
  }
  return trimmed;
}

function formatPosDate(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
}

function formatPosTime(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const value = raw.trim();
  if (/^\d{6}$/.test(value)) {
    return `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}`;
  }
  return value;
}

export type SettlementTicketTransactionLine = {
  posReference: string;
  createdAt: string;
  amountDisplay: string;
  /** Prefer POS terminal date/time when available. */
  posDateTime?: string | null;
};

export type FormatSettlementTicketParams = {
  settlementData: KioskSettlementData;
  referenceNo?: string;
  approved: boolean;
  transactions?: SettlementTicketTransactionLine[];
};

function formatTicketTxDateTime(tx: SettlementTicketTransactionLine): string {
  if (tx.posDateTime?.trim()) {
    return tx.posDateTime.trim();
  }
  const date = new Date(tx.createdAt);
  if (Number.isNaN(date.getTime())) {
    return tx.createdAt;
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function appendTransactionsSection(
  lines: string[],
  transactions: SettlementTicketTransactionLine[] | undefined,
): void {
  lines.push('TRANSACCIONES DEL LOTE');
  lines.push('--------------------------------');
  const txs = transactions ?? [];
  if (txs.length === 0) {
    lines.push('Sin transacciones locales registradas.');
  } else {
    txs.forEach((tx, index) => {
      lines.push(
        `${index + 1}) Ref: ${tx.posReference}  Fecha: ${formatTicketTxDateTime(tx)}  Monto: ${tx.amountDisplay}`,
      );
    });
    lines.push('--------------------------------');
    lines.push(`Total txs: ${txs.length}`);
  }
  lines.push('--------------------------------');
}

/** Plain-text body for settlement ticket (header/footer are native). */
export function formatSettlementTicketText(params: FormatSettlementTicketParams): string {
  const { settlementData, referenceNo, approved, transactions } = params;
  const lines: string[] = [];

  lines.push('--------------------------------');
  lines.push(`Estado: ${approved ? 'EXITOSO' : 'FALLIDO'}`);

  const responseMessage = readLine('Mensaje', settlementData.responseMessage);
  if (responseMessage) {
    lines.push(responseMessage);
  }

  const responseCode = readLine('Codigo Resp', settlementData.responseCode);
  if (responseCode) {
    lines.push(responseCode);
  }

  const posDate = formatPosDate(settlementData.date);
  const posTime = formatPosTime(settlementData.time);
  if (posDate || posTime) {
    lines.push(`Fecha POS: ${[posDate, posTime].filter(Boolean).join(' ')}`);
  }

  lines.push('--------------------------------');
  lines.push('TERMINAL');
  lines.push('--------------------------------');

  for (const line of [
    readLine('Terminal ID', settlementData.terminalID),
    readLine('Comercio ID', settlementData.merchantID),
    readLine('Serial POS', settlementData.deviceSerial),
    readLine('Referencia', referenceNo ?? settlementData.referenceNumber),
    readLine('Trace', settlementData.traceNumber),
  ]) {
    if (line) {
      lines.push(line);
    }
  }

  lines.push('--------------------------------');
  lines.push('LOTES');
  lines.push('--------------------------------');

  for (const line of [
    readLine('Lote Credito', settlementData.CreditBatchNo),
    readLine('Lote Debito', settlementData.DebitBatchNo),
    readLine('Lote Extra', settlementData.ExtraBatchNo),
  ]) {
    if (line) {
      lines.push(line);
    }
  }

  lines.push('--------------------------------');
  lines.push('VENTAS');
  lines.push('--------------------------------');
  lines.push(`Credito:  ${formatSettlementAmount(settlementData.totalCreditCardSale)}`);
  lines.push(`Debito:   ${formatSettlementAmount(settlementData.totalDebitCardSale)}`);
  lines.push(`Extra:    ${formatSettlementAmount(settlementData.totalExtraSale)}`);

  lines.push('--------------------------------');
  lines.push('DEVOLUCIONES');
  lines.push('--------------------------------');
  lines.push(`Credito:  ${formatSettlementAmount(settlementData.totalCreditCardRefund)}`);
  lines.push(`Debito:   ${formatSettlementAmount(settlementData.totalDebitCardRefund)}`);
  lines.push(`Extra:    ${formatSettlementAmount(settlementData.totalExtraRefund)}`);
  lines.push('--------------------------------');

  appendTransactionsSection(lines, transactions);

  return lines.join('\n');
}
