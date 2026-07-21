import type { CartLine } from '@shared/kiosk-order/types';

export const mockCartLines: CartLine[] = [
  {
    lineId: 'mock-line-1',
    productId: 'cup-large',
    quantity: 1,
    unitPrice: 4.5,
    modifierSelections: [
      {
        groupId: 'cup-large-toppings',
        options: [
          { optionId: 'oreo', quantity: 1 },
          { optionId: 'fresas', quantity: 1 },
        ],
      },
    ],
  },
  {
    lineId: 'mock-line-2',
    productId: 'yogurt-custom',
    quantity: 2,
    unitPrice: 6,
    modifierSelections: [
      {
        groupId: 'cup-large-toppings',
        options: [{ optionId: 'gomitas', quantity: 1 }],
      },
    ],
  },
];
