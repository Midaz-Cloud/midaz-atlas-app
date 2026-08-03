/** Max total product units in a kiosk session cart (sum of all line quantities). */
export const KIOSK_CART_MAX_UNITS = 99;

export type CartMutationResult =
  | { ok: true }
  | { ok: false; reason: 'session-limit' };

export function remainingCartUnits(itemCount: number): number {
  return Math.max(0, KIOSK_CART_MAX_UNITS - Math.max(0, itemCount));
}

export function wouldExceedCartLimit(itemCount: number, amount: number): boolean {
  return Math.max(0, itemCount) + Math.max(0, amount) > KIOSK_CART_MAX_UNITS;
}
