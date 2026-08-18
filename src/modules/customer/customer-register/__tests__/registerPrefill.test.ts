import { initialRegisterFormFromPrefill } from '../registerPrefill';

describe('initialRegisterFormFromPrefill', () => {
  it('returns empty strings when prefill is missing', () => {
    expect(initialRegisterFormFromPrefill('V12345678')).toEqual({
      firstName: '',
      lastName: '',
      phoneOperatorCode: '414',
      phoneSubscriberNumber: '',
      email: '',
    });
  });

  it('normalizes undefined prefill name fields for natural persons', () => {
    expect(
      initialRegisterFormFromPrefill('V12345678', {
        firstName: undefined as unknown as string,
        lastName: undefined as unknown as string,
      }),
    ).toEqual({
      firstName: '',
      lastName: '',
      phoneOperatorCode: '414',
      phoneSubscriberNumber: '',
      email: '',
    });
  });

  it('merges partial juridico prefill into business name only', () => {
    expect(
      initialRegisterFormFromPrefill('J123456784', {
        firstName: 'Acme C.A.',
        lastName: undefined as unknown as string,
      }),
    ).toEqual({
      firstName: 'Acme C.A.',
      lastName: '',
      phoneOperatorCode: '414',
      phoneSubscriberNumber: '',
      email: '',
    });
  });

  it('prefills email when present', () => {
    expect(
      initialRegisterFormFromPrefill('V12345678', {
        firstName: 'Ana',
        lastName: 'López',
        email: 'Ana@Midaz.com',
      }),
    ).toMatchObject({
      firstName: 'Ana',
      lastName: 'López',
      email: 'ana@midaz.com',
    });
  });
});
