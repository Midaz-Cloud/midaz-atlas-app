import type { OrderFiscalConfig } from './types';

/** Tasas fiscales mock para P8/P9 hasta integración con backend. */
export const defaultOrderFiscalConfig: OrderFiscalConfig = {
  vatRate: 0.16,
  igtfRate: 0.03,
  usdToVesRate: 36.5,
};
