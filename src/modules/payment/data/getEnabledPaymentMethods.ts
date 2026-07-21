import type { PaymentMethodDefinition } from '../types';
import { mockEnabledPaymentMethods } from './mockPaymentMethods';
import { isPaymentMethodEnabledForApi } from '@shared/api/kiosk';
import type { KioskPagoMovilAccount, PaymentMethodApi } from '@shared/api/kiosk';
import { isPagoMovilAccountConfigured } from '@shared/api/kiosk/pagoMovilAccount';
import { shouldUseMockApi } from '@shared/config/api';

export type EnabledPaymentMethodsOptions = {
  pagoMovilAccount?: KioskPagoMovilAccount | null;
};

export function getEnabledPaymentMethods(
  enabledApiMethods: PaymentMethodApi[] | undefined,
  options?: EnabledPaymentMethodsOptions,
): PaymentMethodDefinition[] {
  const apiMethods = enabledApiMethods ?? ['debito', 'pago_movil'];
  const allowZelle = shouldUseMockApi();
  const requirePagoMovilAccount = !shouldUseMockApi();

  return mockEnabledPaymentMethods.filter((method) => {
    if (!isPaymentMethodEnabledForApi(method.id, apiMethods, allowZelle)) {
      return false;
    }
    if (
      method.id === 'mobile' &&
      requirePagoMovilAccount &&
      !isPagoMovilAccountConfigured(options?.pagoMovilAccount)
    ) {
      return false;
    }
    return true;
  });
}

export function getDefaultPaymentMethodId(
  enabledApiMethods: PaymentMethodApi[] | undefined,
  options?: EnabledPaymentMethodsOptions,
): PaymentMethodDefinition['id'] {
  const methods = getEnabledPaymentMethods(enabledApiMethods, options);
  return methods[0]?.id ?? 'pos';
}
