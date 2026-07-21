import type { CartLine, OrderTotals } from '@shared/kiosk-order/types';

import type { FormatOrderTicketParams } from './formatOrderTicketText';

/** Sample order for home-screen printer test (modifiers, totals, multiple lines). */
export function getPrinterTestOrderParams(): FormatOrderTicketParams {
  const lines: CartLine[] = [
    {
      lineId: 'test-yogurt',
      productId: 'yogurt-custom',
      quantity: 1,
      unitPrice: 4.5,
      modifierSelections: [
        {
          groupId: 'yogurt-type',
          options: [{ optionId: 'yogurt-light', quantity: 1 }],
        },
        {
          groupId: 'yogurt-toppings',
          options: [
            { optionId: 'oreo', quantity: 1 },
            { optionId: 'brownie', quantity: 1 },
          ],
        },
        {
          groupId: 'yogurt-sirope',
          options: [{ optionId: 'sirope-fresa', quantity: 1 }],
        },
      ],
    },
    {
      lineId: 'test-yogurt-2',
      productId: 'yogurt-custom',
      quantity: 1,
      unitPrice: 4.5,
      modifierSelections: [
        {
          groupId: 'yogurt-type',
          options: [{ optionId: 'yogurt-normal', quantity: 1 }],
        },
        {
          groupId: 'yogurt-toppings',
          options: [
            { optionId: 'gomitas', quantity: 1 },
            { optionId: 'chispas', quantity: 1 },
          ],
        },
        {
          groupId: 'yogurt-sirope',
          options: [{ optionId: 'sirope-chocolate', quantity: 1 }],
        },
      ],
    },
    {
      lineId: 'test-cup',
      productId: 'cup-large',
      quantity: 2,
      unitPrice: 5,
      modifierSelections: [
        {
          groupId: 'cup-large-toppings',
          options: [
            { optionId: 'oreo', quantity: 1 },
            { optionId: 'fresas', quantity: 1 },
            { optionId: 'gomitas', quantity: 1 },
          ],
        },
      ],
    },
    {
      lineId: 'test-sundae',
      productId: 'mega-sundae-mix',
      quantity: 1,
      unitPrice: 6,
    },
  ];

  const subtotalUsd = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const taxUsd = Math.round(subtotalUsd * 0.16 * 100) / 100;
  const totalUsd = Math.round((subtotalUsd + taxUsd) * 100) / 100;
  const usdToVesRate = 50;

  const totals: OrderTotals = {
    subtotalUsd,
    taxUsd,
    totalUsd,
    totalVes: totalUsd * usdToVesRate,
  };

  return {
    displayOrderNumber: 'TEST-PRINT',
    lines,
    totals,
    usdToVesRate,
    orderType: 'takeOut',
  };
}
