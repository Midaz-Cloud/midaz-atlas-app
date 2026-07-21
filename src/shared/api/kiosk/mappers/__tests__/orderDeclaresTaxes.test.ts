import type { CartLine } from '@shared/kiosk-order/types';

import { mapCartToCreateOrderRequest } from '../order';

jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogEntryByLineProductId: () => ({
    product: { taxRate: 16, isExempt: false },
    apiProductId: 62,
  }),
}));

jest.mock('@shared/config/api', () => ({
  shouldUseMockApi: () => false,
}));

const sampleLine: CartLine = {
  lineId: '1',
  productId: '62',
  quantity: 1,
  unitPrice: 1,
  taxRate: 16,
  isExempt: false,
};

describe('mapCartToCreateOrderRequest declaresTaxes', () => {
  it('sends taxRate 0 on items when declaresTaxes is false', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [sampleLine],
      declaresTaxes: false,
    });

    expect(request.items).toHaveLength(1);
    expect(request.items[0].taxRate).toBe(0);
  });

  it('sends product taxRate when declaresTaxes is true', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [sampleLine],
      declaresTaxes: true,
    });

    expect(request.items[0].taxRate).toBe(16);
  });

  it('defaults to taxRate 0 when declaresTaxes is omitted', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [sampleLine],
    });

    expect(request.items[0].taxRate).toBe(0);
  });
});
