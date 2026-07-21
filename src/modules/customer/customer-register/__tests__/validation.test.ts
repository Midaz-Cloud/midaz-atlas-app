import { composeRegisterPhone, isRegisterFormValid, isValidPhone } from '../validation';

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
        phoneOperatorCode: '415',
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
