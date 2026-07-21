import { emitFiscalInvoice, resetFiscalClientForTests } from '../index';

jest.mock('@shared/config/fiscal', () => ({
  shouldUseMockFiscal: () => true,
  getFiscalServiceBaseUrl: () => 'http://127.0.0.1:8765',
}));

describe('emitFiscalInvoice (mock)', () => {
  beforeEach(() => {
    resetFiscalClientForTests();
  });

  it('returns mock issued invoice number without fetch', async () => {
    const envelope = await emitFiscalInvoice({
      rif: 'J412438905',
      businessName: 'Demo C.A.',
      lines: [{ taxRateCode: 1, price: 1, quantity: 1, description: 'Test' }],
      payments: [{ methodCode: 1, amount: 0 }],
    });

    expect(envelope.success).toBe(true);
    expect(envelope.data?.issuedInvoiceNumber).toBe(999);
  });
});
