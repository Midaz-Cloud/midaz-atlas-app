import { orderTypeToFulfillment } from '../fulfillment';

describe('orderTypeToFulfillment', () => {
  it('maps dineIn to IN_STORE', () => {
    expect(orderTypeToFulfillment('dineIn')).toBe('IN_STORE');
  });

  it('maps takeOut to PICKUP', () => {
    expect(orderTypeToFulfillment('takeOut')).toBe('PICKUP');
  });

  it('defaults to IN_STORE', () => {
    expect(orderTypeToFulfillment(undefined)).toBe('IN_STORE');
  });
});
