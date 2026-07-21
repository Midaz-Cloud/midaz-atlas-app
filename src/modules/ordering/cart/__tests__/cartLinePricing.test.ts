import type { CartLine } from '@shared/kiosk-order/types';

import {
  cartLineDisplayUnitPrice,
  cartLineTotalPrimary,
} from '../cartLinePricing';

describe('cartLinePricing', () => {
  const baseLine: CartLine = {
    lineId: 'line-1',
    productId: 'yogurt',
    quantity: 1,
    unitPrice: 10,
    modifierSurchargePrimary: 4,
  };

  it('includes modifier surcharge in display unit price', () => {
    expect(cartLineDisplayUnitPrice(baseLine, 4)).toBe(14);
    expect(cartLineTotalPrimary(baseLine, 4)).toBe(14);
  });

  it('spreads line surcharge across quantity when qty > 1', () => {
    const line: CartLine = { ...baseLine, quantity: 2 };
    expect(cartLineTotalPrimary(line, 4)).toBe(24);
    expect(cartLineDisplayUnitPrice(line, 4)).toBe(12);
  });

  it('shows base price when there is no surcharge', () => {
    expect(cartLineDisplayUnitPrice(baseLine, 0)).toBe(10);
  });
});
