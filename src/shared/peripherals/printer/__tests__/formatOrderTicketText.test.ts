import type { CartLine, OrderTotals } from '@shared/kiosk-order/types';

import { formatOrderTicketText } from '../formatOrderTicketText';

const totals: OrderTotals = {
  subtotalUsd: 17.5,
  taxUsd: 2.8,
  totalUsd: 20.3,
  subtotalVes: 875,
  taxVes: 140,
  totalVes: 1015,
};

describe('formatOrderTicketText', () => {
  it('formats order number, lines and totals', () => {
    const lines: CartLine[] = [
      {
        lineId: '1',
        productId: 'mega-sundae-mix',
        quantity: 2,
        unitPrice: 6,
      },
    ];

    const text = formatOrderTicketText({
      displayOrderNumber: 'K-123456',
      lines,
      totals,
      usdToVesRate: 50,
      orderType: 'takeOut',
      declaresTaxes: true,
    });

    expect(text).toContain('ORDEN: K-123456');
    expect(text).toContain('Tipo:');
    expect(text).toMatch(/Para llevar|Take out/i);
    expect(text).toContain('Tasa:');
    expect(text).toContain('50');
    expect(text).not.toContain('TOTAL USD:');
    expect(text).toContain('Subtotal:');
    expect(text).toContain('Bs. 875.00');
    expect(text).toContain('IVA:');
    expect(text).toContain('Bs. 140.00');
    expect(text).toContain('Total:');
    expect(text).toContain('Bs. 1,015.00');
  });

  it('prints Bs line prices and skips exchange rate when primary is VES', () => {
    const vesTotals: OrderTotals = {
      subtotalUsd: 10,
      taxUsd: 1.6,
      totalUsd: 11.6,
      subtotalVes: 10,
      taxVes: 1.6,
      totalVes: 11.6,
    };

    const text = formatOrderTicketText({
      displayOrderNumber: 'K-VES',
      lines: [{ lineId: '1', productId: 'p1', quantity: 1, unitPrice: 10 }],
      totals: vesTotals,
      usdToVesRate: 36.5,
      primaryCurrency: 'VES',
      orderType: 'takeOut',
      declaresTaxes: true,
    });

    expect(text).not.toContain('Tasa:');
    expect(text).not.toContain('$10.00');
    expect(text).toContain('Bs. 10.00');
    expect(text).toContain('Bs. 11.60');
  });

  it('skips printing IVA line when declaresTaxes is false', () => {
    const text = formatOrderTicketText({
      displayOrderNumber: 'K-NOTAX',
      lines: [{ lineId: '1', productId: 'p1', quantity: 1, unitPrice: 10 }],
      totals: {
        subtotalUsd: 10,
        taxUsd: 0,
        totalUsd: 10,
        subtotalVes: 500,
        taxVes: 0,
        totalVes: 500,
      },
      usdToVesRate: 50,
      orderType: 'takeOut',
      declaresTaxes: false,
    });

    expect(text).toContain('Subtotal:');
    expect(text).not.toContain('IVA:');
    expect(text).toContain('Total:');
  });
});
