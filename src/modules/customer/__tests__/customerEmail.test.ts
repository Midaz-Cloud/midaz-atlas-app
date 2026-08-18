import { customerNeedsEmailUpdate, mapCustomerToRegisterPrefill } from '../customerEmail';

describe('customerNeedsEmailUpdate', () => {
  it('requires update when digital invoicing and customer has no email', () => {
    expect(customerNeedsEmailUpdate({ email: '' }, true)).toBe(true);
    expect(customerNeedsEmailUpdate({ email: '   ' }, true)).toBe(true);
    expect(customerNeedsEmailUpdate({ email: null }, true)).toBe(true);
    expect(customerNeedsEmailUpdate({}, true)).toBe(true);
  });

  it('does not require update when customer already has email', () => {
    expect(customerNeedsEmailUpdate({ email: 'ana@midaz.com' }, true)).toBe(false);
  });

  it('does not require update when email is not required (physical fiscal)', () => {
    expect(customerNeedsEmailUpdate({ email: '' }, false)).toBe(false);
    expect(customerNeedsEmailUpdate({ email: 'ana@midaz.com' }, false)).toBe(false);
  });
});

describe('mapCustomerToRegisterPrefill', () => {
  it('maps names and optional phone/email', () => {
    expect(
      mapCustomerToRegisterPrefill({
        firstName: 'Ana',
        lastName: 'López',
        phone: '04141234567',
        email: '',
      }),
    ).toEqual({
      firstName: 'Ana',
      lastName: 'López',
      phone: '04141234567',
    });
  });
});
