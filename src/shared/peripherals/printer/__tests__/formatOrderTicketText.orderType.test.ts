import type { CartLine, OrderTotals } from '@shared/kiosk-order/types';

import {
  formatOrderTicketText,
  formatTicketExchangeRateLine,
} from '../formatOrderTicketText';

const totals: OrderTotals = {
  subtotalUsd: 10,
  taxUsd: 0,
  totalUsd: 10,
  totalVes: 365,
};

const lines: CartLine[] = [
  { lineId: '1', productId: 'p1', quantity: 1, unitPrice: 10 },
];

describe('formatOrderTicketText order metadata', () => {
  it('maps dineIn and takeOut to introduction translations', () => {
    const dineIn = formatOrderTicketText({
      displayOrderNumber: 'K-1',
      lines,
      totals,
      usdToVesRate: 36.5,
      orderType: 'dineIn',
    });
    expect(dineIn).toContain('Tipo:');
    expect(dineIn).not.toContain('dineIn');
    expect(dineIn).toMatch(/Para comer aquí|Dine in/i);

    const takeOut = formatOrderTicketText({
      displayOrderNumber: 'K-2',
      lines,
      totals,
      usdToVesRate: 36.5,
      orderType: 'takeOut',
    });
    expect(takeOut).not.toContain('takeOut');
    expect(takeOut).toMatch(/Para llevar|Take out/i);
  });

  it('prints exchange rate after order type', () => {
    const text = formatOrderTicketText({
      displayOrderNumber: 'K-3',
      lines,
      totals,
      usdToVesRate: 530.5047,
      orderType: 'takeOut',
    });

    expect(text).toContain(formatTicketExchangeRateLine(530.5047));
    const tipoIndex = text.indexOf('Tipo:');
    const tasaIndex = text.indexOf('Tasa:');
    expect(tipoIndex).toBeGreaterThanOrEqual(0);
    expect(tasaIndex).toBeGreaterThan(tipoIndex);
  });
});
