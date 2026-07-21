import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import {
  computeModifierPriceDeltas,
  computeModifierPriceDeltasFromQuantities,
  freeModifierSlots,
  sumModifierPriceDeltas,
} from '../computeModifierPriceDeltas';

const sampleGroup: ProductModifierGroup = {
  id: 'grp-1',
  name: 'Agregados',
  isRequired: false,
  minSelection: 0,
  maxSelection: 3,
  quotaFree: 1,
  quotaFreeBySize: null,
  excessPrice: 1.5,
  sortOrder: 0,
  options: [
    { id: 'opt-a', name: 'Queso', additionalPrice: 1, sortOrder: 0 },
    { id: 'opt-b', name: 'Tocino', additionalPrice: 1.5, sortOrder: 1 },
    { id: 'opt-c', name: 'Extra', additionalPrice: 2, sortOrder: 2 },
  ],
};

const paidGroup: ProductModifierGroup = {
  id: 'grp-paid',
  name: 'Toppings',
  isRequired: false,
  minSelection: 0,
  maxSelection: 5,
  quotaFree: 0,
  quotaFreeBySize: null,
  excessPrice: 4,
  sortOrder: 0,
  options: [
    { id: 'opt-1', name: 'Topping A', additionalPrice: 4, sortOrder: 0 },
    { id: 'opt-2', name: 'Topping B', additionalPrice: 4, sortOrder: 1 },
  ],
};

describe('computeModifierPriceDeltas', () => {
  it('freeModifierSlots: 0 when quotaFree is 0, else quotaFree + 1', () => {
    expect(freeModifierSlots(0)).toBe(0);
    expect(freeModifierSlots(1)).toBe(2);
  });

  it('charges each selection when quotaFree is 0', () => {
    const rows = computeModifierPriceDeltas(paidGroup, ['opt-1', 'opt-2']);
    expect(rows[0].priceDelta).toBe(4);
    expect(rows[1].priceDelta).toBe(4);
    expect(sumModifierPriceDeltas(rows)).toBe(8);
  });

  it('first two selections are free when quotaFree is 1', () => {
    const rows = computeModifierPriceDeltas(sampleGroup, ['opt-a', 'opt-b']);
    expect(rows).toHaveLength(2);
    expect(rows[0].priceDelta).toBe(0);
    expect(rows[1].priceDelta).toBe(0);
    expect(sumModifierPriceDeltas(rows)).toBe(0);
  });

  it('third selection uses min(additionalPrice, excessPrice)', () => {
    const rows = computeModifierPriceDeltas(sampleGroup, [
      'opt-a',
      'opt-b',
      'opt-c',
    ]);
    expect(rows[2].priceDelta).toBe(1.5);
  });

  it('uses additionalPrice when lower than excessPrice on paid slot', () => {
    const rows = computeModifierPriceDeltas(sampleGroup, [
      'opt-a',
      'opt-b',
      'opt-a',
    ]);
    expect(rows[2].priceDelta).toBe(1);
  });
});

describe('computeModifierPriceDeltasFromQuantities', () => {
  it('supports repeated option (Miel x2) within maxSelection', () => {
    const rows = computeModifierPriceDeltasFromQuantities(sampleGroup, [
      { optionId: 'opt-a', quantity: 2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].optionId).toBe('opt-a');
    expect(rows[0].quantity).toBe(2);
    expect(rows[0].priceDelta).toBe(0);
    expect(sumModifierPriceDeltas(rows)).toBe(0);
  });

  it('aggregates same optionId and priceDelta into one row', () => {
    const rows = computeModifierPriceDeltasFromQuantities(paidGroup, [
      { optionId: 'opt-1', quantity: 2 },
    ]);
    expect(rows).toEqual([
      expect.objectContaining({
        optionId: 'opt-1',
        quantity: 2,
        priceDelta: 4,
      }),
    ]);
    expect(sumModifierPriceDeltas(rows)).toBe(8);
  });

  it('splits rows when same option has free and paid slots', () => {
    const rows = computeModifierPriceDeltasFromQuantities(sampleGroup, [
      { optionId: 'opt-a', quantity: 3 },
    ]);
    expect(rows).toHaveLength(2);
    const freeRow = rows.find((row) => row.priceDelta === 0);
    const paidRow = rows.find((row) => row.priceDelta === 1);
    expect(freeRow?.quantity).toBe(2);
    expect(paidRow?.quantity).toBe(1);
    expect(sumModifierPriceDeltas(rows)).toBe(1);
  });
});
