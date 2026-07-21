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

describe('mapCartToCreateOrderRequest modifiers', () => {
  it('includes selections.modifiers from appliedModifiers', () => {
    const lines: CartLine[] = [
      {
        lineId: '1',
        productId: '62',
        quantity: 1,
        unitPrice: 2,
        taxRate: 16,
        isExempt: false,
        appliedModifiers: [
          {
            groupId: 'grp-1',
            groupName: 'Agregados',
            optionId: 'opt-a',
            optionName: 'Queso',
            quantity: 1,
            priceDelta: 0,
          },
        ],
        modifierSurchargePrimary: 0,
      },
    ];

    const request = mapCartToCreateOrderRequest({ lines });
    expect(request.items[0].selections?.modifiers).toHaveLength(1);
    expect(request.items[0].selections?.modifiers![0].priceDelta).toBe(0);
    expect(request.items[0].productId).toBe(62);
  });

  it('passes modifier quantity from appliedModifiers (UPDATE-8)', () => {
    const lines: CartLine[] = [
      {
        lineId: '1',
        productId: '62',
        quantity: 1,
        unitPrice: 2,
        taxRate: 16,
        isExempt: false,
        appliedModifiers: [
          {
            groupId: 'grp-1',
            groupName: 'Agregados',
            optionId: 'opt-a',
            optionName: 'Miel',
            quantity: 2,
            priceDelta: 1,
          },
        ],
        modifierSurchargePrimary: 2,
      },
    ];

    const request = mapCartToCreateOrderRequest({ lines });
    expect(request.items[0].quantity).toBe(1);
    expect(request.items[0].selections?.modifiers![0].quantity).toBe(2);
    expect(request.items[0].selections?.modifiers![0].priceDelta).toBe(1);
  });
});
