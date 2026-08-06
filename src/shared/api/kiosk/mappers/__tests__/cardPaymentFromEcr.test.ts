import { buildPosPaymentFromEcr } from '../cardPaymentFromEcr';

const APPROVED_POS_RESPONSE = String.raw`[{"success":true,"type":"payment","result":0,"referenceNo":"REF-1779837562397","data":{"responseCode":"00","responseMessage":"APPROVED","referenceNumber":"000008","traceNumber":"000027","batchNum":"000001","RRN":"614623000027","amount":"100","terminalID":"00001001","deviceSerial":"N620W312565","merchantID":"0078513748","accountType":1,"errorCode":0}}]`;

describe('buildPosPaymentFromEcr', () => {
  const customer = {
    documentId: 'V25504486',
    firstName: 'Juan',
    lastName: 'Perez',
    phone: '04121234567',
  };

  it('maps approved terminal payload to UPDATE-7 posResponse', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: APPROVED_POS_RESPONSE,
      customer,
      payerDocumentId: customer.documentId,
      paymentMethodId: 'pos',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.payload.cedula).toBe('V25504486');
    expect(result.payload.cardHolder).toBe('JUAN PEREZ');
    expect(result.payload.cardType).toBe('debito');
    expect(result.payload.posResponse.responseCode).toBe('00');
    expect(result.payload.posResponse.RRN).toBe('614623000027');
    expect(result.payload.posResponse.referenceNumber).toBe('000008');
    expect(result.payload.posResponse.terminalID).toBe('00001001');
    expect(result.payload.posReference).toBe('614623000027');
  });

  it('rejects hard-fail errorCode even with RRN present', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: JSON.stringify({
        errorCode: -1,
        responseCode: '03',
        responseMessage: 'DECLINED',
        traceNumber: '000001',
        RRN: '614622000001',
        amount: '100',
      }),
      customer,
      payerDocumentId: customer.documentId,
    });
    expect(result.ok).toBe(false);
  });

  it('approves via cascade when only APPROVED message is present', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: JSON.stringify({
        responseMessage: 'APPROVED',
      }),
      customer,
      payerDocumentId: customer.documentId,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects payload with no cascade success signals', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: JSON.stringify({
        responseCode: '00',
        responseMessage: 'PENDING',
      }),
      customer,
      payerDocumentId: customer.documentId,
    });
    expect(result.ok).toBe(false);
  });

  it('uses traceNumber as referenceNumber when referenceNumber absent', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: JSON.stringify({
        responseCode: '00',
        responseMessage: 'APPROVED',
        traceNumber: '000027',
        batchNum: '000001',
        RRN: '614623000027',
        amount: '100',
      }),
      customer,
      payerDocumentId: customer.documentId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.posResponse.referenceNumber).toBe('000027');
    }
  });

  it('uses payerDocumentId for cedula when it differs from billing customer', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: APPROVED_POS_RESPONSE,
      customer,
      payerDocumentId: 'E87654321',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.cedula).toBe('E87654321');
    }
  });
});
