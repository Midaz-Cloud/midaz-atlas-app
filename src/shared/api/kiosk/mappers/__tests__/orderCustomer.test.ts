import { mapCartToCreateOrderRequest } from '../order';

describe('mapCartToCreateOrderRequest customerId', () => {
  it('includes customerId when provided', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      customerId: 42,
    });
    expect(request.customerId).toBe(42);
  });
});
