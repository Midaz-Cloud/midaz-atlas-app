import { buildFiscalTestInvoiceRequest } from '../buildFiscalTestInvoiceRequest';

describe('buildFiscalTestInvoiceRequest', () => {
  it('builds simple invoice with IVA general when declaresTaxes is true', () => {
    const request = buildFiscalTestInvoiceRequest({
      rif: 'J412438905',
      businessName: 'DISTRIBUIDORA GLOBAL DE INSUMOS XXI C.A.',
      address: 'Caracas',
      declaresTaxes: true,
    });

    expect(request.rif).toBe('J412438905');
    expect(request.businessName).toBe('DISTRIBUIDORA GLOBAL DE INSUMOS XX');
    expect(request.businessName.length).toBeLessThanOrEqual(34);
    expect(request.mixedPayments).toBe(false);
    expect(request.applyIgtf).toBe(false);
    expect(request.lines).toHaveLength(1);
    expect(request.lines[0]).toMatchObject({
      taxRateCode: 1,
      price: 1,
      quantity: 1,
    });
    expect(request.payments).toEqual([{ methodCode: 1, amount: 0 }]);
  });

  it('uses exento taxRateCode when declaresTaxes is false', () => {
    const request = buildFiscalTestInvoiceRequest({
      rif: 'J412438905',
      businessName: 'Demo',
      declaresTaxes: false,
    });

    expect(request.lines[0].taxRateCode).toBe(0);
  });

  it('truncates long fields to fiscal limits', () => {
    const request = buildFiscalTestInvoiceRequest({
      rif: 'J'.repeat(50),
      businessName: 'X'.repeat(50),
      address: 'Y'.repeat(50),
    });

    expect(request.rif.length).toBeLessThanOrEqual(38);
    expect(request.businessName.length).toBeLessThanOrEqual(34);
    expect(request.address?.length).toBeLessThanOrEqual(40);
  });
});
