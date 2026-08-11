import { isPaymentRouteLockedAfterCheckoutStart } from '../paymentRouteGuards';

describe('isPaymentRouteLockedAfterCheckoutStart', () => {
  it('locks outcome and processing so catalog refresh cannot navigate away', () => {
    expect(isPaymentRouteLockedAfterCheckoutStart('outcome')).toBe(true);
    expect(isPaymentRouteLockedAfterCheckoutStart('processing')).toBe(true);
    expect(isPaymentRouteLockedAfterCheckoutStart('pos-charging')).toBe(true);
    expect(isPaymentRouteLockedAfterCheckoutStart('cash')).toBe(true);
    expect(isPaymentRouteLockedAfterCheckoutStart('flow')).toBe(false);
    expect(isPaymentRouteLockedAfterCheckoutStart('method-select')).toBe(false);
  });
});
