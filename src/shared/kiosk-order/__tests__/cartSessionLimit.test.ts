import {
  KIOSK_CART_MAX_UNITS,
  remainingCartUnits,
  wouldExceedCartLimit,
} from '../cartSessionLimit';

describe('cartSessionLimit', () => {
  it('exposes a session max of 99 units', () => {
    expect(KIOSK_CART_MAX_UNITS).toBe(99);
  });

  it('computes remaining units', () => {
    expect(remainingCartUnits(0)).toBe(99);
    expect(remainingCartUnits(90)).toBe(9);
    expect(remainingCartUnits(99)).toBe(0);
    expect(remainingCartUnits(120)).toBe(0);
  });

  it('detects when adding would exceed the limit', () => {
    expect(wouldExceedCartLimit(98, 1)).toBe(false);
    expect(wouldExceedCartLimit(99, 1)).toBe(true);
    expect(wouldExceedCartLimit(97, 3)).toBe(true);
    expect(wouldExceedCartLimit(97, 2)).toBe(false);
  });
});
