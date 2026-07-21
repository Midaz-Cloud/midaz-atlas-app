import { useMemo } from 'react';

import { useKioskOrganization } from '@shared/session';
import {
  computeOrderTotals,
  defaultOrderFiscalConfig,
  type CartLine,
  type ComputeOrderTotalsOptions,
  type OrderFiscalConfig,
  type OrderTotals,
} from '@shared/kiosk-order';

export type { ComputeOrderTotalsOptions, OrderTotals } from '@shared/kiosk-order';
export { computeOrderTotals } from '@shared/kiosk-order';

export function useOrderTotals(
  lines: CartLine[],
  config: OrderFiscalConfig = defaultOrderFiscalConfig,
  options?: ComputeOrderTotalsOptions,
): OrderTotals {
  const organization = useKioskOrganization();
  const declaresTaxes = organization?.declaresTaxes ?? false;
  const applyIgtf = options?.applyIgtf ?? false;

  const computeOptions = useMemo(
    () => ({
      ...options,
      applyIgtf,
      declaresTaxes,
    }),
    [options, applyIgtf, declaresTaxes],
  );

  return useMemo(
    () => computeOrderTotals(lines, config, computeOptions),
    [lines, config, computeOptions],
  );
}
