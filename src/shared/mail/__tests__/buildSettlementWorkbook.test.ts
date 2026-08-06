import {
  buildSettlementWorkbookBase64,
  buildSettlementWorkbookSheets,
  formatPosTime12h,
} from '../buildSettlementWorkbook';
import { getSettlementMailTestParams } from '../settlementMailTestFixture';

describe('formatPosTime12h', () => {
  it('formats HHmmss to 12-hour am/pm', () => {
    expect(formatPosTime12h('120000')).toBe('12:00 pm');
    expect(formatPosTime12h('003000')).toBe('12:30 am');
    expect(formatPosTime12h('153045')).toBe('3:30 pm');
    expect(formatPosTime12h('090500')).toBe('9:05 am');
  });
});

describe('buildSettlementWorkbookSheets', () => {
  it('sections Resumen like the settlement ticket without status fields', () => {
    const sheets = buildSettlementWorkbookSheets(getSettlementMailTestParams());

    expect(sheets.sheetNames).toEqual(['Resumen', 'Transacciones']);

    const labels = sheets.resumenRows.map(([left]) => left.text);
    expect(labels).not.toContain('Estado');
    expect(labels).not.toContain('Mensaje');
    expect(labels).not.toContain('Codigo Resp');
    expect(labels).toContain('TERMINAL');
    expect(labels).toContain('LOTES');
    expect(labels).toContain('VENTAS');
    expect(labels).toContain('DEVOLUCIONES');
    expect(labels).toContain('TRANSACCIONES DEL LOTE');

    const fecha = sheets.resumenRows.find(([left]) => left.text === 'Fecha POS');
    expect(fecha?.[1].text).toBe('04/08/2026 12:00 pm');

    const serial = sheets.resumenRows.find(([left]) => left.text === 'Serial POS');
    expect(serial?.[1].text).toBe('N620W304722');

    const ventaCredito = sheets.resumenRows.find(
      ([left, right]) => left.text === 'Credito' && right.kind === 'amount',
    );
    // First amount Credito under VENTAS
    const amountCreditos = sheets.resumenRows.filter(
      ([left, right]) => left.text === 'Credito' && right.kind === 'amount',
    );
    expect(amountCreditos[0]?.[1].text).toBe('150.00');
    expect(ventaCredito?.[1].kind).toBe('amount');

    const totalLocal = sheets.resumenRows.find(
      ([left]) => left.text === 'Total kiosco (local)',
    );
    expect(totalLocal?.[1].text).toBe('42.75');
    expect(totalLocal?.[1].kind).toBe('amount');

    // Two blank rows before TERMINAL
    const terminalIdx = sheets.resumenRows.findIndex(([left]) => left.text === 'TERMINAL');
    expect(sheets.resumenRows[terminalIdx - 1]?.[0].kind).toBe('blank');
    expect(sheets.resumenRows[terminalIdx - 2]?.[0].kind).toBe('blank');

    expect(sheets.transaccionesHeader[0]).toBe('#');
    expect(sheets.transaccionesRows).toHaveLength(3);
    expect(sheets.transaccionesRows[0][3]).toBe('10.00');
    expect(sheets.montoColumnIndex).toBe(3);
  });
});

describe('buildSettlementWorkbookBase64', () => {
  it('produces a non-empty xlsx base64 payload', () => {
    const base64 = buildSettlementWorkbookBase64({
      ...getSettlementMailTestParams(),
      headerColor: '#004be0',
    });
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(100);
  });
});
