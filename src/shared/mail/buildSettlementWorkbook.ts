import type { KioskSettlementData } from '@shared/api/kiosk/types';
import { formatSettlementAmount } from '@shared/peripherals/printer/formatSettlementTicketText';
import type { SuccessfulPosTransactionRecord } from '@shared/persistence';
import { brand } from '@shared/theme';

export type SettlementExcelTransaction = Pick<
  SuccessfulPosTransactionRecord,
  | 'posReference'
  | 'createdAt'
  | 'amountDisplay'
  | 'posDateTime'
  | 'rrn'
  | 'traceNumber'
  | 'batchNum'
  | 'deviceSerial'
  | 'cardType'
>;

export type BuildSettlementWorkbookParams = {
  settlementData: KioskSettlementData;
  referenceNo?: string;
  approved: boolean;
  transactions?: SettlementExcelTransaction[];
  /** Organization primary color for Transacciones header (hex). */
  headerColor?: string;
};

type ResumenCellKind = 'label' | 'value' | 'section' | 'amount' | 'blank';

export type ResumenSheetCell = {
  text: string;
  kind: ResumenCellKind;
};

export type SettlementWorkbookSheets = {
  sheetNames: ['Resumen', 'Transacciones'];
  /** Rows of [labelCol, valueCol] for Resumen (no Campo/Valor header). */
  resumenRows: Array<[ResumenSheetCell, ResumenSheetCell]>;
  transaccionesHeader: string[];
  transaccionesRows: Array<Array<string | number>>;
  /** 0-based column index of Monto in Transacciones. */
  montoColumnIndex: number;
  headerColor: string;
};

const DEFAULT_HEADER_COLOR = brand.blue;

function formatPosDate(raw: string | undefined): string {
  if (!raw?.trim()) {
    return '';
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

/** Formats POS `HHmmss` (or `HH:mm:ss`) as 12-hour clock, e.g. `12:30 pm`. */
export function formatPosTime12h(raw: string | undefined): string {
  if (!raw?.trim()) {
    return '';
  }
  const value = raw.trim();
  let hours: number;
  let minutes: number;
  if (/^\d{6}$/.test(value)) {
    hours = Number.parseInt(value.slice(0, 2), 10);
    minutes = Number.parseInt(value.slice(2, 4), 10);
  } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const parts = value.split(':');
    hours = Number.parseInt(parts[0]!, 10);
    minutes = Number.parseInt(parts[1]!, 10);
  } else {
    return value;
  }
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }
  const period = hours >= 12 ? 'pm' : 'am';
  let h12 = hours % 12;
  if (h12 === 0) {
    h12 = 12;
  }
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatFechaPos(dateRaw: string | undefined, timeRaw: string | undefined): string {
  const posDate = formatPosDate(dateRaw);
  const posTime = formatPosTime12h(timeRaw);
  return [posDate, posTime].filter(Boolean).join(' ');
}

function formatTxDateTime(tx: SettlementExcelTransaction): string {
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
  const time12 = formatPosTime12h(
    `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`,
  );
  return `${dd}/${mm}/${yyyy} ${time12}`;
}

function sumAmountDisplay(transactions: SettlementExcelTransaction[]): string {
  let sum = 0;
  for (const tx of transactions) {
    const n = Number.parseFloat(tx.amountDisplay.replace(',', '.'));
    if (Number.isFinite(n)) {
      sum += n;
    }
  }
  return sum.toFixed(2);
}

function cell(text: string, kind: ResumenCellKind): ResumenSheetCell {
  return { text, kind };
}

function blankRow(): [ResumenSheetCell, ResumenSheetCell] {
  return [cell('', 'blank'), cell('', 'blank')];
}

function sectionTitle(title: string): [ResumenSheetCell, ResumenSheetCell] {
  return [cell(title, 'section'), cell('', 'blank')];
}

function fieldRow(label: string, value: string): [ResumenSheetCell, ResumenSheetCell] {
  return [cell(label, 'label'), cell(value, 'value')];
}

function amountRow(label: string, value: string): [ResumenSheetCell, ResumenSheetCell] {
  return [cell(label, 'label'), cell(value, 'amount')];
}

function normalizeHexColor(raw: string | undefined): string {
  const fallback = DEFAULT_HEADER_COLOR.replace('#', '').toUpperCase();
  if (!raw?.trim()) {
    return fallback;
  }
  const cleaned = raw.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned
      .split('')
      .map((c) => `${c}${c}`)
      .join('');
  }
  return fallback;
}

/** Pure sheet data for Excel / unit tests (no filesystem). */
export function buildSettlementWorkbookSheets(
  params: BuildSettlementWorkbookParams,
): SettlementWorkbookSheets {
  const { settlementData, referenceNo, transactions = [] } = params;
  const fechaPos = formatFechaPos(settlementData.date, settlementData.time);
  const resumenRows: Array<[ResumenSheetCell, ResumenSheetCell]> = [];

  if (fechaPos) {
    resumenRows.push(fieldRow('Fecha POS', fechaPos));
  }

  resumenRows.push(blankRow(), blankRow());
  resumenRows.push(sectionTitle('TERMINAL'));
  resumenRows.push(fieldRow('Terminal ID', settlementData.terminalID ?? ''));
  resumenRows.push(fieldRow('Comercio ID', settlementData.merchantID ?? ''));
  resumenRows.push(fieldRow('Serial POS', settlementData.deviceSerial ?? ''));
  resumenRows.push(
    fieldRow('Referencia', referenceNo ?? settlementData.referenceNumber ?? ''),
  );
  resumenRows.push(fieldRow('Trace', settlementData.traceNumber ?? ''));

  resumenRows.push(blankRow(), blankRow());
  resumenRows.push(sectionTitle('LOTES'));
  resumenRows.push(fieldRow('Lote Credito', settlementData.CreditBatchNo ?? ''));
  resumenRows.push(fieldRow('Lote Debito', settlementData.DebitBatchNo ?? ''));
  resumenRows.push(fieldRow('Lote Extra', settlementData.ExtraBatchNo ?? ''));

  resumenRows.push(blankRow(), blankRow());
  resumenRows.push(sectionTitle('VENTAS'));
  resumenRows.push(
    amountRow('Credito', formatSettlementAmount(settlementData.totalCreditCardSale)),
  );
  resumenRows.push(
    amountRow('Debito', formatSettlementAmount(settlementData.totalDebitCardSale)),
  );
  resumenRows.push(
    amountRow('Extra', formatSettlementAmount(settlementData.totalExtraSale)),
  );

  resumenRows.push(blankRow(), blankRow());
  resumenRows.push(sectionTitle('DEVOLUCIONES'));
  resumenRows.push(
    amountRow('Credito', formatSettlementAmount(settlementData.totalCreditCardRefund)),
  );
  resumenRows.push(
    amountRow('Debito', formatSettlementAmount(settlementData.totalDebitCardRefund)),
  );
  resumenRows.push(
    amountRow('Extra', formatSettlementAmount(settlementData.totalExtraRefund)),
  );

  resumenRows.push(blankRow(), blankRow());
  resumenRows.push(sectionTitle('TRANSACCIONES DEL LOTE'));
  resumenRows.push(fieldRow('Total txs', String(transactions.length)));
  resumenRows.push(
    amountRow(
      'Total kiosco (local)',
      transactions.length > 0 ? sumAmountDisplay(transactions) : '0.00',
    ),
  );

  const transaccionesHeader = [
    '#',
    'Ref',
    'Fecha',
    'Monto',
    'RRN',
    'Trace',
    'Batch',
    'Serial',
    'Tipo tarjeta',
  ];
  const montoColumnIndex = 3;

  const transaccionesRows = transactions.map((tx, index) => [
    index + 1,
    tx.posReference,
    formatTxDateTime(tx),
    tx.amountDisplay,
    tx.rrn ?? '',
    tx.traceNumber ?? '',
    tx.batchNum ?? '',
    tx.deviceSerial ?? '',
    tx.cardType ?? '',
  ]);

  return {
    sheetNames: ['Resumen', 'Transacciones'],
    resumenRows,
    transaccionesHeader,
    transaccionesRows,
    montoColumnIndex,
    headerColor: normalizeHexColor(params.headerColor),
  };
}

export function buildSettlementWorkbookBase64(
  params: BuildSettlementWorkbookParams,
): string {
  // Use plain `xlsx` on device: `xlsx-js-style` can block Hermes indefinitely
  // when applying cell styles during XLSX.write (seen hanging at "Generando documento").
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const sheets = buildSettlementWorkbookSheets(params);
  const workbook = XLSX.utils.book_new();

  const resumenAoA = sheets.resumenRows.map(([left, right]) => [left.text, right.text]);
  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenAoA);
  resumenSheet['!cols'] = [{ wch: 24 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

  const txsAoA: Array<Array<string | number>> = [
    sheets.transaccionesHeader,
    ...sheets.transaccionesRows,
  ];
  const txsSheet = XLSX.utils.aoa_to_sheet(txsAoA);
  txsSheet['!cols'] = [
    { wch: 4 },
    { wch: 14 },
    { wch: 20 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, txsSheet, 'Transacciones');

  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;
}

export type SettlementExcelFileResult = {
  path: string;
  fileName: string;
};

/** Writes settlement workbook under DocumentDir/midaz-atlas/mail/. */
export async function buildSettlementExcelFile(
  params: BuildSettlementWorkbookParams,
): Promise<SettlementExcelFileResult> {
  const { getBlobUtilModule } = await import('@shared/images/blobUtilLazy');
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    throw new Error(
      'No se pudo escribir el Excel: react-native-blob-util no está disponible. Recompila la app.',
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const serial =
    params.settlementData.deviceSerial?.replace(/[^0-9A-Za-z_-]/g, '') || 'POS';
  const fileName = `cierre-lote-${serial}-${stamp}.xlsx`;
  const dir = `${blobUtil.fs.dirs.DocumentDir}/midaz-atlas/mail`;
  const path = `${dir}/${fileName}`;

  const exists = await blobUtil.fs.exists(dir);
  if (!exists) {
    await blobUtil.fs.mkdir(dir);
  }

  // Yield so UI can paint "Generando documento" before sync XLSX.write.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  if (__DEV__) {
    console.log('[SettlementExcel] XLSX.write start');
  }
  const base64 = buildSettlementWorkbookBase64(params);
  if (__DEV__) {
    console.log('[SettlementExcel] XLSX.write done bytes~', Math.round(base64.length * 0.75));
  }
  await blobUtil.fs.writeFile(path, base64, 'base64');

  return { path, fileName };
}
