import {
  isPaymentMethodEnabledForApi,
  paymentMethodApiToUi,
  paymentMethodIdToApi,
} from '../paymentMethod';

describe('paymentMethod mappers', () => {
  it('maps UI pos/mobile/cash to API debito/pago_movil/efectivo_ves', () => {
    expect(paymentMethodIdToApi('pos')).toBe('debito');
    expect(paymentMethodIdToApi('mobile')).toBe('pago_movil');
    expect(paymentMethodIdToApi('cash')).toBe('efectivo_ves');
  });

  it('maps API methods back to UI ids', () => {
    expect(paymentMethodApiToUi('debito')).toBe('pos');
    expect(paymentMethodApiToUi('pago_movil')).toBe('mobile');
    expect(paymentMethodApiToUi('efectivo')).toBe('cash');
    expect(paymentMethodApiToUi('efectivo_ves')).toBe('cash');
  });

  it('shows cash when efectivo_ves is enabled (QA live config)', () => {
    expect(
      isPaymentMethodEnabledForApi(
        'cash',
        ['debito', 'pago_movil', 'efectivo_ves'],
        false,
      ),
    ).toBe(true);
  });

  it('shows cash when legacy efectivo is enabled', () => {
    expect(
      isPaymentMethodEnabledForApi('cash', ['debito', 'efectivo'], false),
    ).toBe(true);
  });

  it('hides zelle on live API list', () => {
    expect(
      isPaymentMethodEnabledForApi('zelle', ['debito', 'pago_movil'], false),
    ).toBe(false);
  });

  it('allows zelle only in mock mode', () => {
    expect(
      isPaymentMethodEnabledForApi('zelle', ['debito', 'pago_movil'], true),
    ).toBe(true);
  });
});
