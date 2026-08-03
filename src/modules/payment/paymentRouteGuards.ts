/** Routes that must not be overwritten when enabledMethods / catalog refresh re-runs. */
export function isPaymentRouteLockedAfterCheckoutStart(name: string): boolean {
  return (
    name === 'processing' ||
    name === 'outcome' ||
    name === 'assistance' ||
    name === 'payment-error' ||
    name === 'reference' ||
    name === 'cash' ||
    name === 'stock-shortage'
  );
}
