import { resolveBcvExchangeRate } from '@shared/pricing';

import { useKioskSession } from './KioskSessionProvider';

export function useKioskBootstrap() {
  const ctx = useKioskSession();
  return {
    status: ctx.status,
    snapshot: ctx.bootstrapSnapshot,
    runtimeConfig: ctx.runtimeConfig,
    deviceSerial: ctx.deviceSerial,
    bootstrapPhase: ctx.bootstrapPhase,
    retryBootstrap: ctx.retryBootstrap,
    authErrorMessage: ctx.authErrorMessage,
  };
}

export function useKioskAppearance() {
  const { bootstrapSnapshot } = useKioskSession();
  if (!bootstrapSnapshot) {
    return null;
  }
  return bootstrapSnapshot.appearance;
}

export function useKioskOrganization() {
  const { bootstrapSnapshot } = useKioskSession();
  if (!bootstrapSnapshot) {
    return null;
  }
  return bootstrapSnapshot.organization;
}

export function useKioskOperational() {
  const { bootstrapSnapshot } = useKioskSession();
  if (!bootstrapSnapshot) {
    return null;
  }
  return bootstrapSnapshot.operational;
}

export function useKioskPricing() {
  const { bootstrapSnapshot } = useKioskSession();
  if (!bootstrapSnapshot) {
    return null;
  }
  return bootstrapSnapshot.pricing;
}

/** BCV rate from config (`exchangeRates`) for the org primary currency; hidden when primary is VES. */
export function useBcvExchangeRate(): number | null {
  const pricing = useKioskPricing();
  if (!pricing) {
    return null;
  }
  return resolveBcvExchangeRate(pricing.primaryCurrency, pricing.exchangeRates);
}
