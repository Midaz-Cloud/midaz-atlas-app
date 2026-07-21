import { isVesPrimaryCurrency } from './kioskPricing';

export type KioskExchangeRatesLike = {
  usd: number;
  eur: number;
};

function isPositiveRate(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

/**
 * BCV reference rate (Bs per unit of primary currency) from kiosk config.
 * Returns null when primary is VES or the matching rate is missing.
 */
export function resolveBcvExchangeRate(
  primaryCurrency: string,
  exchangeRates: KioskExchangeRatesLike | null | undefined,
): number | null {
  if (isVesPrimaryCurrency(primaryCurrency) || !exchangeRates) {
    return null;
  }

  const code = primaryCurrency.toUpperCase();
  if (code === 'EUR') {
    return isPositiveRate(exchangeRates.eur) ? exchangeRates.eur : null;
  }

  return isPositiveRate(exchangeRates.usd) ? exchangeRates.usd : null;
}
