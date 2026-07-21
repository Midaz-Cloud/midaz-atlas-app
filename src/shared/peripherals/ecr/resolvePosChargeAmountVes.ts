import { getKioskPosTestChargeVes } from '@shared/config';

/** Amount in Bs to charge on the datáfono (may differ from cart total during testing). */
export function resolvePosChargeAmountVes(cartTotalVes: number): number {
  const testCharge = getKioskPosTestChargeVes();
  if (testCharge != null) {
    return testCharge;
  }
  return cartTotalVes;
}

export function isPosTestChargeActive(): boolean {
  return getKioskPosTestChargeVes() != null;
}
