import type { PaymentMethodDefinition } from '../types';
import { mockEnabledPaymentMethods } from './mockPaymentMethods';
import { isPaymentMethodEnabledForApi } from '@shared/api/kiosk';
import type { KioskPagoMovilAccount, PaymentMethodApi } from '@shared/api/kiosk';
import { isPagoMovilAccountConfigured } from '@shared/api/kiosk/pagoMovilAccount';
import { shouldUseMockApi } from '@shared/config/api';

export type EnabledPaymentMethodsOptions = {
  pagoMovilAccount?: KioskPagoMovilAccount | null;
  /** Sin backend: solo lo que se cobra sin validar en línea (POS; efectivo si se permite). */
  offline?: boolean;
  /** Efectivo sin red: la caja también depende del backend, por eso va apagado por defecto. */
  offlineCashAllowed?: boolean;
};

/** Métodos que no se pueden cobrar sin backend (pago móvil se valida en DisGlobal). */
function isAvailableOffline(methodId: PaymentMethodDefinition['id'], cashAllowed: boolean): boolean {
  if (methodId === 'pos') {
    return true;
  }
  return methodId === 'cash' && cashAllowed;
}

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
    if (options?.offline && !isAvailableOffline(method.id, options.offlineCashAllowed === true)) {
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
