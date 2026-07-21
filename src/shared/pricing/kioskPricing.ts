/** Primary currency codes from kiosk config. */
export type KioskPrimaryCurrency = string;

export function isVesPrimaryCurrency(currency: string): boolean {
  return currency.toUpperCase() === 'VES';
}

export function showsBolivarPrices(primaryCurrency: string): boolean {
  return !isVesPrimaryCurrency(primaryCurrency);
}

/**
 * Unit prices from API product row — no device-side FX conversion.
 */
export function resolveUnitPricesFromApi(
  priceString: string,
  priceVES: number | undefined,
  primaryCurrency: string,
): { unitPrice: number; unitPriceVes?: number } {
  const unitPrice = Number.parseFloat(priceString);
  const safePrimary = Number.isFinite(unitPrice) ? unitPrice : 0;

  if (isVesPrimaryCurrency(primaryCurrency)) {
    return { unitPrice: safePrimary };
  }

  if (priceVES != null && Number.isFinite(priceVES)) {
    return { unitPrice: safePrimary, unitPriceVes: priceVES };
  }

  return { unitPrice: safePrimary };
}
