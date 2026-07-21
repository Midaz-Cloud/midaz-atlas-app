import type { CartLine } from '@shared/kiosk-order/types';

import { formatCartLineModifierLines } from '../formatCartLineModifierLines';
import { formatOrderTicketText } from '../formatOrderTicketText';
import { TICKET_LINE_WIDTH } from '../ticketLineLayout';

function expectTicketLines(lines: string[]) {
  for (const line of lines) {
    expect(line.length).toBeLessThanOrEqual(TICKET_LINE_WIDTH);
  }
}

describe('formatCartLineModifierLines', () => {
  it('prints each option with group label, price suffix and width', () => {
    const line: CartLine = {
      lineId: '1',
      productId: 'yogurt-custom',
      quantity: 1,
      unitPrice: 8,
      modifierSelections: [
        {
          groupId: 'yogurt-toppings',
          options: [
            { optionId: 'oreo', quantity: 1 },
            { optionId: 'chispas', quantity: 1 },
          ],
        },
        {
          groupId: 'yogurt-sirope',
          options: [{ optionId: 'sirope-fresa', quantity: 1 }],
        },
        {
          groupId: 'yogurt-type',
          options: [{ optionId: 'yogurt-light', quantity: 1 }],
        },
      ],
    };

    const rows = formatCartLineModifierLines(line);

    expect(rows.length).toBe(4);
    expectTicketLines(rows);
    expect(rows[0]).toMatch(/\+ Light \[base de yogurt\].+Gratis/);
    expect(rows[1]).toMatch(/\+ Oreo \[(complementos|add-ons)\].+Gratis/);
    expect(rows[2]).toMatch(/\+ Chispas \[(complementos|add-ons)\].+Gratis/);
    expect(rows[3]).toMatch(/\+ Sirope fresa \[sirop\].+Gratis/);
  });

  it('uses appliedModifiers optionName, groupName and priceDelta', () => {
    const line: CartLine = {
      lineId: '1',
      productId: '62',
      quantity: 1,
      unitPrice: 2,
      modifierSelections: [
        {
          groupId: 'a1b2-group',
          options: [
            { optionId: 'opt-queso', quantity: 1 },
            { optionId: 'opt-jamon', quantity: 1 },
          ],
        },
      ],
      appliedModifiers: [
        {
          groupId: 'a1b2-group',
          groupName: 'Agregados',
          optionId: 'opt-queso',
          optionName: 'Queso',
          quantity: 1,
          priceDelta: 0,
        },
        {
          groupId: 'a1b2-group',
          groupName: 'Agregados',
          optionId: 'opt-jamon',
          optionName: 'Jamón',
          quantity: 1,
          priceDelta: 0.5,
        },
      ],
    };

    const rows = formatCartLineModifierLines(line);

    expectTicketLines(rows);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/\+ Queso \[Agregados\].+Gratis/);
    expect(rows[1]).toMatch(/\+ Jamón \[Agregados\].+\$0\.50/);
  });
});

describe('formatOrderTicketText with modifiers', () => {
  it('includes modifier lines under each product', () => {
    const text = formatOrderTicketText({
      displayOrderNumber: 'K-99',
      lines: [
        {
          lineId: '1',
          productId: 'yogurt-custom',
          quantity: 1,
          unitPrice: 8,
          modifierSelections: [
            {
              groupId: 'yogurt-type',
              options: [{ optionId: 'yogurt-light', quantity: 1 }],
            },
            {
              groupId: 'yogurt-toppings',
              options: [{ optionId: 'oreo', quantity: 1 }],
            },
          ],
        },
      ],
      totals: { subtotalUsd: 8, taxUsd: 0, totalUsd: 8, totalVes: 400 },
      usdToVesRate: 50,
    });

    expect(text).toContain('1x ');
    expect(text).toMatch(/\+ Light \[base de yogurt\].+Gratis/);
    expect(text).toMatch(/\+ Oreo \[(complementos|add-ons)\].+Gratis/);
  });
});
