import {
  canIncrementOption,
  decrementOptionQty,
  incrementOptionQty,
  isModifierGroupValid,
  totalSlotsUsed,
} from '../modifierSelectionState';

const group = { minSelections: 1, maxSelections: 2 };

describe('modifierSelectionState quantities', () => {
  it('counts total slots including repeats', () => {
    expect(totalSlotsUsed({ a: 2 })).toBe(2);
  });

  it('validates min and max by slot sum', () => {
    expect(isModifierGroupValid({ a: 2 }, group)).toBe(true);
    expect(isModifierGroupValid({ a: 1 }, group)).toBe(true);
    expect(isModifierGroupValid({}, group)).toBe(false);
    expect(isModifierGroupValid({ a: 2, b: 1 }, { ...group, maxSelections: 2 })).toBe(false);
  });

  it('increments and decrements option qty', () => {
    let qty = incrementOptionQty({}, 'a', group);
    expect(qty.a).toBe(1);
    qty = incrementOptionQty(qty, 'a', group);
    expect(qty.a).toBe(2);
    expect(canIncrementOption(qty, group)).toBe(false);
    qty = decrementOptionQty(qty, 'a');
    expect(qty.a).toBe(1);
    qty = decrementOptionQty(qty, 'a');
    expect(qty.a).toBeUndefined();
  });
});
