import { mapCartToCreateOrderRequest } from '../order';

const cardPayment = {
  posResponse: {
    responseCode: '00',
    responseMessage: 'APPROVED',
    referenceNumber: '000008',
    traceNumber: '000027',
    RRN: '614623000027',
    terminalID: '00001001',
    deviceSerial: 'N620W312565',
    merchantID: '0078513748',
    accountType: 1,
    batchNum: '000001',
    amount: '100',
  },
  cardType: 'debito',
  cedula: 'V25504486',
  cardHolder: 'JUAN PEREZ',
  posReference: '614623000027',
};

describe('mapCartToCreateOrderRequest card payment', () => {
  it('includes posResponse for debito', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      cardPayment,
    });

    expect(request.paymentMethod).toBe('debito');
    expect(request.posResponse?.RRN).toBe('614623000027');
    expect(request.posResponse?.responseCode).toBe('00');
    expect(request.cedula).toBe('V25504486');
    expect(request.cardType).toBe('debito');
    expect(request.cardHolder).toBe('JUAN PEREZ');
    expect(request).not.toHaveProperty('fiscalNumber');
    expect(request).not.toHaveProperty('invoiceNumber');
    expect(request).not.toHaveProperty('issuedInvoiceNumber');
    expect(request).not.toHaveProperty('fiscalInvoiceNumber');
  });

  it('includes fiscalInvoiceNumber when HkaApp already issued', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      cardPayment,
      fiscalInvoiceNumber: 42,
    });

    expect(request.fiscalInvoiceNumber).toBe(42);
    expect(request).not.toHaveProperty('issuedInvoiceNumber');
  });
});
