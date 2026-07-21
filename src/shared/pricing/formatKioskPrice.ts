import { formatUsdCompact, formatUsdPrice, formatVesPrice } from '@shared/utils/formatPrice';

export function formatPrimaryPrice(amount: number, primaryCurrency: string): string {
  const code = primaryCurrency.toUpperCase();
  if (code === 'USD') {
    return formatUsdPrice(amount);
  }
  if (code === 'VES') {
    return formatVesPrice(amount);
  }
  return `${code} ${amount.toFixed(2)}`;
}

/** Compact amount for floating cart chips (e.g. `$5.00` or `Bs. 150,00`). */
export function formatPrimaryPriceCompact(amount: number, primaryCurrency: string): string {
  const code = primaryCurrency.toUpperCase();
  if (code === 'USD') {
    return formatUsdCompact(amount);
  }
  if (code === 'VES') {
    return formatVesPrice(amount);
  }
  return `${code} ${amount.toFixed(2)}`;
}

/** Secondary bolívar amount on retail cart lines (e.g. `181.50 VES`). */
export function formatVesLineAmount(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} VES`;
}

/** Single-line price for product cards — primary currency only (no dual USD/Bs). */
export function formatProductPriceLabel(
  unitPrice: number,
  primaryCurrency: string,
  _unitPriceVes?: number,
): string {
  return formatPrimaryPrice(unitPrice, primaryCurrency);
}
