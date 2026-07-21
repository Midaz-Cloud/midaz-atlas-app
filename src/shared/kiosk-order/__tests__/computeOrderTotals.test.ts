import { computeOrderTotals } from '../computeOrderTotals';

describe('computeOrderTotals', () => {
  it('includes IVA in totalVes when lines have unitPriceVes', () => {
    const totals = computeOrderTotals(
      [
        {
          lineId: '1',
          productId: 'p1',
          quantity: 2,
          unitPrice: 2,
          unitPriceVes: 73,
          taxRate: 16,
          isExempt: false,
        },
      ],
      { vatRate: 0.16, igtfRate: 0, usdToVesRate: 50 },
      { usePerLineTax: true, declaresTaxes: true },
    );

    expect(totals.subtotalVes).toBe(146);
    expect(totals.taxVes).toBe(23.36);
    expect(totals.totalVes).toBe(169.36);
    expect(totals.totalUsd).toBe(4.64);
  });

  it('converts USD total to Bs when no unitPriceVes', () => {
    const totals = computeOrderTotals(
      [{ lineId: '1', productId: 'p1', quantity: 1, unitPrice: 10 }],
      { vatRate: 0.16, igtfRate: 0, usdToVesRate: 36.5 },
      { declaresTaxes: true },
    );

    expect(totals.subtotalUsd).toBe(10);
    expect(totals.taxUsd).toBe(1.6);
    expect(totals.totalUsd).toBe(11.6);
    expect(totals.totalVes).toBe(423.4);
  });

  it('does not FX-convert when primary currency is VES', () => {
    const totals = computeOrderTotals(
      [{ lineId: '1', productId: 'p1', quantity: 1, unitPrice: 10, taxRate: 16, isExempt: false }],
      { vatRate: 0.16, igtfRate: 0, usdToVesRate: 36.5 },
      { usePerLineTax: true, primaryCurrency: 'VES', declaresTaxes: true },
    );

    expect(totals.subtotalUsd).toBe(10);
    expect(totals.taxUsd).toBe(1.6);
    expect(totals.totalUsd).toBe(11.6);
    expect(totals.subtotalVes).toBe(10);
    expect(totals.taxVes).toBe(1.6);
    expect(totals.totalVes).toBe(11.6);
  });

  it('does not calculate or add VAT when declaresTaxes is false', () => {
    const totals = computeOrderTotals(
      [
        {
          lineId: '1',
          productId: 'p1',
          quantity: 2,
          unitPrice: 2,
          unitPriceVes: 73,
          taxRate: 16,
          isExempt: false,
        },
      ],
      { vatRate: 0.16, igtfRate: 0, usdToVesRate: 50 },
      { usePerLineTax: true, declaresTaxes: false },
    );

    expect(totals.subtotalVes).toBe(146);
    expect(totals.taxVes).toBe(0);
    expect(totals.totalVes).toBe(146);
    expect(totals.subtotalUsd).toBe(4);
    expect(totals.taxUsd).toBe(0);
    expect(totals.totalUsd).toBe(4);
  });
});
