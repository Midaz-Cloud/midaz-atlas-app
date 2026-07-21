import type { ReactNode } from 'react';

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
  const fiscalConfig = fiscalConfigForSession(pricing);
  const computeOptions: ComputeOrderTotalsOptions = {
    usePerLineTax: !shouldUseMockApi() && (pricing?.usePerLineTax ?? false),
    declaresTaxes: parseDeclaresTaxes(organization?.declaresTaxes),
  };
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';

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
