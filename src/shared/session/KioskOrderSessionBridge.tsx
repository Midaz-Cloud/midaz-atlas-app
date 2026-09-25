import { useMemo, type ReactNode } from 'react';

import { KioskOrderProvider } from '@shared/kiosk-order';
import { defaultOrderFiscalConfig } from '@shared/kiosk-order/mockOrderFiscalConfig';
import type { ComputeOrderTotalsOptions, OrderFiscalConfig } from '@shared/kiosk-order/types';
import { shouldUseMockApi } from '@shared/config/api';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { resolveBcvExchangeRate } from '@shared/pricing';

import { useKioskPricing, useKioskOrganization } from './kioskSessionHooks';

type KioskOrderSessionBridgeProps = {
  children: ReactNode;
};

function fiscalConfigForSession(pricing: ReturnType<typeof useKioskPricing>): OrderFiscalConfig {
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const bcvRate = resolveBcvExchangeRate(primaryCurrency, pricing?.exchangeRates);
  const usdToVesRate = bcvRate ?? defaultOrderFiscalConfig.usdToVesRate;

  if (shouldUseMockApi()) {
    return { ...defaultOrderFiscalConfig, usdToVesRate };
  }
  return {
    vatRate: 0,
    igtfRate: defaultOrderFiscalConfig.igtfRate,
    usdToVesRate,
  };
}

export function KioskOrderSessionBridge({ children }: KioskOrderSessionBridgeProps) {
  const pricing = useKioskPricing();
  const organization = useKioskOrganization();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const usePerLineTax = pricing?.usePerLineTax ?? false;
  const exchangeRatesKey = pricing?.exchangeRates ? JSON.stringify(pricing.exchangeRates) : null;
  const declaresTaxes = parseDeclaresTaxes(organization?.declaresTaxes);

  // Deps son primitivas (moneda, flags, snapshot serializado de tasas) para que
  // `fiscalConfig`/`computeOptions` mantengan identidad estable entre renders y
  // no re-disparen efectos/memos aguas abajo (p.ej. en `useKioskOrder`) sin que
  // el valor real haya cambiado.
  const fiscalConfig = useMemo<OrderFiscalConfig>(
    () => fiscalConfigForSession(pricing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryCurrency, exchangeRatesKey],
  );
  const computeOptions = useMemo<ComputeOrderTotalsOptions>(
    () => ({
      usePerLineTax: !shouldUseMockApi() && usePerLineTax,
      declaresTaxes,
    }),
    [usePerLineTax, declaresTaxes],
  );

  return (
    <KioskOrderProvider
      fiscalConfig={fiscalConfig}
      computeOptions={computeOptions}
      primaryCurrency={primaryCurrency}
    >
      {children}
    </KioskOrderProvider>
  );
}
