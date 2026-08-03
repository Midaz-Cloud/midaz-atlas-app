import { formatSettlementAmount, formatSettlementTicketText } from '../formatSettlementTicketText';

describe('formatSettlementTicketText', () => {
  it('prints detailed settlement movements without receipt footer text', () => {
    const text = formatSettlementTicketText({
      approved: true,
      referenceNo: 'REF-1781294570906',
      settlementData: {
        CreditBatchNo: '000002',
        DebitBatchNo: '000001',
        ExtraBatchNo: '000001',
        totalCreditCardSale: '15000',
        totalDebitCardSale: '98050',
        totalExtraSale: '0',
        totalCreditCardRefund: '0',
        totalDebitCardRefund: '1200',
        totalExtraRefund: '0',
        responseCode: '00',
        responseMessage: 'APPROVED',
        terminalID: '00001001',
        merchantID: '0087654729',
        deviceSerial: 'N620W322141',
        date: '20260612',
        time: '160253',
        traceNumber: '000001',
        referenceNumber: '888000000601',
      },
    });

    expect(text).toContain('Estado: EXITOSO');
    expect(text).toContain('Lote Credito: 000002');
    expect(text).toContain('Lote Debito: 000001');
    expect(text).toContain('VENTAS');
    expect(text).toContain('DEVOLUCIONES');
    expect(text).toContain('Credito:  150.00');
    expect(text).toContain('Debito:   980.50');
    expect(text).toContain('TRANSACCIONES DEL LOTE');
    expect(text).toContain('Sin transacciones locales registradas.');
    expect(text).not.toContain('Conserve este comprobante');
    expect(text).not.toContain('Gracias por su compra');
    expect(text).not.toContain('CIERRE DE CONTINGENCIA');
  });

  it('appends local successful POS transactions at the end', () => {
    const text = formatSettlementTicketText({
      approved: true,
      settlementData: {
        responseCode: '00',
        responseMessage: 'APPROVED',
        totalDebitCardSale: '100',
        date: '20260731',
        time: '180000',
      },
      transactions: [
        {
          posReference: '62122000016',
          createdAt: '2026-07-31T20:00:00.000Z',
          amountDisplay: '10.00',
          posDateTime: '31/07/2026 16:00:00',
        },
        {
          posReference: '62122000017',
          createdAt: '2026-07-31T20:05:00.000Z',
          amountDisplay: '25.50',
        },
      ],
    });

    expect(text).toContain('TRANSACCIONES DEL LOTE');
    expect(text).toContain('1) Ref: 62122000016  Fecha: 31/07/2026 16:00:00  Monto: 10.00');
    expect(text).toContain('2) Ref: 62122000017');
    expect(text).toContain('Monto: 25.50');
    expect(text).toContain('Total txs: 2');
  });

  it('prints salvaged partial settlement fields without inventing totals', () => {
    const text = formatSettlementTicketText({
      approved: true,
      referenceNo: 'REF-1785540217065',
      settlementData: {
        responseCode: '00',
        responseMessage: 'APPROVED',
        deviceSerial: 'N620W304722',
        CreditBatchNo: '000018',
        DebitBatchNo: '000017',
        totalCreditCardSale: '0',
      },
    });

    expect(text).toContain('Estado: EXITOSO');
    expect(text).toContain('Serial POS: N620W304722');
    expect(text).toContain('Lote Credito: 000018');
    expect(text).toContain('Credito:  0.00');
  });
});

describe('formatSettlementAmount', () => {
  it('formats integer cents as decimal', () => {
    expect(formatSettlementAmount('100')).toBe('1.00');
  });

  it('preserves decimal strings', () => {
    expect(formatSettlementAmount('150.00')).toBe('150.00');
  });
});
