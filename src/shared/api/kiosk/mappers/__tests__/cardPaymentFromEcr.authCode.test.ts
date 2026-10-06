import { buildPosPaymentFromEcr } from '../cardPaymentFromEcr';

// Venta real 2026-09-24 16:01 (N620W322177, crédito, factura 1383): el terminal
// devolvió authCode pero no llegaba a pos_transactions.authorizationCode.
const RAW_2026_09_24 =
  '{"success":true,"type":"payment","result":0,"referenceNo":"REF-1790280093173","data":{"merchantID":"0087654729","deviceSerial":"N620W322177","success":true,"referenceNumber":"000004","responseMessage":"APPROVED","authCode":"912571","RRN":"626720000025","amount":"100","batchNum":"000001","traceNumber":"000025","datetime":"2026-09-24T16:01:36","terminalID":"00002001"}}';

describe('buildPosPaymentFromEcr authCode', () => {
  it('propaga el authCode del terminal al posResponse', () => {
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: RAW_2026_09_24,
      customer: { documentId: 'V26396697', firstName: 'Keiver', lastName: 'Pacheco', phone: '' },
      payerDocumentId: 'V26396697',
      paymentMethodId: 'credito',
      amountSentCents: 100,
      skipSideEffects: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload.posResponse.authCode).toBe('912571');
    expect(result.payload.posResponse.RRN).toBe('626720000025');
  });
});
