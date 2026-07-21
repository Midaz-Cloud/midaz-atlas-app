/**
 * POS/datáfono amounts are sent in centésimas de bolívar: 100 = 1.00 Bs, 10 = 0.10, 1 = 0.01.
 */
export function toEcrTerminalAmount(vesAmount: number): number {
  if (!Number.isFinite(vesAmount) || vesAmount < 0) {
    return 0;
  }
  return Math.round(vesAmount * 100);
}

export function formatEcrTerminalAmountHint(terminalAmount: number): string {
  const ves = terminalAmount / 100;
  return `${ves.toFixed(2)} Bs (${terminalAmount} al terminal)`;
}
