import type { PaymentMethodDefinition } from '../types';

/** Métodos habilitados para la sucursal (mock hasta API). Figma 43:155. */
export const mockEnabledPaymentMethods: PaymentMethodDefinition[] = [
  { id: 'pos', enabled: true },
  { id: 'mobile', enabled: true },
  { id: 'cash', enabled: true },
];
