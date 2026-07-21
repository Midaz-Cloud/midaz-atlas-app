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
    expect(text).not.toContain('Conserve este comprobante');
    expect(text).not.toContain('Gracias por su compra');
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
