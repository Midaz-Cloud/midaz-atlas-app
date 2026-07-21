/** Métodos de pago habilitados en kiosk (P9 / P10). */
export type PaymentMethodId = 'pos' | 'mobile' | 'cash' | 'zelle';

/** P11–P12.1 · confirmación por referencia (pago móvil / Zelle). */
export type TransferPaymentMethodId = Extract<PaymentMethodId, 'mobile' | 'zelle'>;

export type PaymentMethodDefinition = {
  id: PaymentMethodId;
  enabled: boolean;
};
