import {
  composeRegisterPhone,
  isRegisterFormValid,
  isValidCustomerEmail,
  isValidPhone,
} from '../validation';

describe('customer register validation', () => {
  it('validates venezuelan national phone', () => {
    expect(isValidPhone('04141234567')).toBe(true);
    expect(isValidPhone('+584141234567')).toBe(true);
    expect(isValidPhone('04151234567')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
  });

  it('composes national phone for API', () => {
    expect(composeRegisterPhone('414', '1234567')).toBe('04141234567');
  });

  it('requires first name, last name and valid phone for natural persons', () => {
    expect(
      isRegisterFormValid({
        documentType: 'V',
        firstName: 'Ana',
        lastName: 'López',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(true);
    expect(
      isRegisterFormValid({
        documentType: 'V',
        firstName: 'Ana',
        lastName: 'López',
        phoneOperatorCode: '415' as any,
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(false);
    expect(
      isRegisterFormValid({
        documentType: 'V',
        firstName: '',
        lastName: 'López',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(false);
    expect(
      isRegisterFormValid({
        documentType: 'E',
        firstName: 'Ana',
        lastName: '',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(false);
  });

  it('requires only business name and valid phone for juridico documents', () => {
    expect(
      isRegisterFormValid({
        documentType: 'J',
        firstName: 'Acme C.A.',
        lastName: '',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(true);
    expect(
      isRegisterFormValid({
        documentType: 'J',
        firstName: undefined as unknown as string,
        lastName: '',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(false);
  });
});

describe('customer register email validation', () => {
  it('does not require email when the field is hidden (non-digital)', () => {
    expect(
      isRegisterFormValid({
        documentType: 'V',
        firstName: 'Ana',
        lastName: 'López',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
      }),
    ).toBe(true);
    expect(
      isRegisterFormValid({
        documentType: 'V',
        firstName: 'Ana',
        lastName: 'López',
        phoneOperatorCode: '414',
        phoneSubscriberNumber: '1234567',
        requireEmail: false,
        email: '',
      }),
    ).toBe(true);
  });

  it('requires a valid email when digital invoicing is on', () => {
    const base = {
      documentType: 'V' as const,
      firstName: 'Ana',
      lastName: 'López',
      phoneOperatorCode: '414' as const,
      phoneSubscriberNumber: '1234567',
      requireEmail: true,
    };
    expect(isRegisterFormValid({ ...base, email: '' })).toBe(false);
    expect(isRegisterFormValid({ ...base, email: 'ana' })).toBe(false);
    expect(isRegisterFormValid({ ...base, email: 'ana@midaz.com' })).toBe(true);
    expect(isValidCustomerEmail('ana@midaz.com')).toBe(true);
    expect(isValidCustomerEmail('not-an-email')).toBe(false);
    expect(isValidCustomerEmail(`${'a'.repeat(33)}@midaz.com`)).toBe(false);
  });
});
