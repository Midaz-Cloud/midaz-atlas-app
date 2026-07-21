/** Formats a USD amount for kiosk UI (e.g. cart, menu, payment). */
export function formatUsdPrice(amount: number): string {
  return `USD ${amount.toFixed(2)}`;
}

/** Compact USD display (e.g. P5 minimized cart row). */
export function formatUsdCompact(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Formats a VES amount for kiosk checkout (P8) and payment (P10). */
export function formatVesPrice(amount: number): string {
  const formatted = amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs. ${formatted}`;
}

/** Formats the BCV reference rate (Bs per primary currency unit) for checkout (Figma 41:93). */
export function formatBcvRate(rate: number): string {
  const amount = rate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Bs. ${amount}`;
}
