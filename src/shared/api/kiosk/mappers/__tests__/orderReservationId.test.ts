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

describe('mapCartToCreateOrderRequest reservationId', () => {
  it('includes reservationId when provided', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [sampleLine],
      paymentMethodId: 'cash',
      reservationId: 'res-uuid-123',
    });

    expect(request.reservationId).toBe('res-uuid-123');
  });

  it('omits reservationId when not provided', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [sampleLine],
      paymentMethodId: 'cash',
    });

    expect(request.reservationId).toBeUndefined();
  });
});
