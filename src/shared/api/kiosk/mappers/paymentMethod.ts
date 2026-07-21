import type { PaymentMethodId } from '@modules/payment/types';

import type { PaymentMethodApi } from '../types';

/** Valores API que habilitan la tarjeta Efectivo en P9. */
export const CASH_PAYMENT_METHOD_APIS: readonly PaymentMethodApi[] = [
  'efectivo_ves',
  'efectivo',
];

const UI_TO_API: Record<PaymentMethodId, PaymentMethodApi | null> = {
  pos: 'debito',
  mobile: 'pago_movil',
  cash: 'efectivo_ves',
  zelle: null,
};

const API_TO_UI: Record<PaymentMethodApi, PaymentMethodId> = {
  debito: 'pos',
  credito: 'pos',
  pago_movil: 'mobile',
  efectivo: 'cash',
  efectivo_ves: 'cash',
};

export function paymentMethodIdToApi(
  methodId: PaymentMethodId | undefined,
): PaymentMethodApi {
  if (!methodId) {
    return 'debito';
  }
  const api = UI_TO_API[methodId];
  if (!api) {
    return 'debito';
  }
  return api;
}

export function paymentMethodApiToUi(method: PaymentMethodApi): PaymentMethodId {
  return API_TO_UI[method];
}

export function isCashPaymentMethodApi(method: PaymentMethodApi): boolean {
  return (CASH_PAYMENT_METHOD_APIS as readonly string[]).includes(method);
}

export function isPaymentMethodEnabledForApi(
  methodId: PaymentMethodId,
  enabledApiMethods: PaymentMethodApi[],
  allowZelleInMock: boolean,
): boolean {
  if (methodId === 'cash') {
    return enabledApiMethods.some((method) => isCashPaymentMethodApi(method));
  }

  const api = UI_TO_API[methodId];
  if (api) {
    return enabledApiMethods.includes(api);
  }
  return methodId === 'zelle' && allowZelleInMock;
}
