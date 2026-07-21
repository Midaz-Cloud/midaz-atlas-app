import { isVesPrimaryCurrency } from '@shared/pricing/kioskPricing';

import { defaultOrderFiscalConfig } from './mockOrderFiscalConfig';
import type { CartLine, ComputeOrderTotalsOptions, OrderFiscalConfig, OrderTotals } from './types';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function lineSubtotalPrimary(line: CartLine): number {
  const base = line.quantity * line.unitPrice;
  const surcharge = line.modifierSurchargePrimary ?? 0;
  return roundMoney(base + surcharge);
}

function lineTaxPrimary(line: CartLine): number {
  if (line.isExempt || !line.taxRate) {
    return 0;
  }
  return roundMoney(lineSubtotalPrimary(line) * (line.taxRate / 100));
}

function lineSubtotalVes(line: CartLine, usdToVesRate: number): number {
  if (line.unitPriceVes == null) {
    return 0;
  }
  const base = line.quantity * line.unitPriceVes;
  const surcharge =
    line.modifierSurchargePrimary != null && line.modifierSurchargePrimary > 0
      ? roundMoney(line.modifierSurchargePrimary * usdToVesRate)
      : 0;
  return roundMoney(base + surcharge);
}

function lineTaxVes(line: CartLine, usdToVesRate: number): number {
  if (line.isExempt || !line.taxRate || line.unitPriceVes == null) {
    return 0;
  }
  return roundMoney(lineSubtotalVes(line, usdToVesRate) * (line.taxRate / 100));
}

export function computeOrderTotals(
  lines: CartLine[],
  config: OrderFiscalConfig = defaultOrderFiscalConfig,
  options?: ComputeOrderTotalsOptions,
): OrderTotals {
  const subtotalUsd = roundMoney(lines.reduce((sum, line) => sum + lineSubtotalPrimary(line), 0));

  const declaresTaxes = options?.declaresTaxes ?? false;

  const taxUsd = declaresTaxes
    ? (options?.usePerLineTax
        ? roundMoney(lines.reduce((sum, line) => sum + lineTaxPrimary(line), 0))
        : roundMoney(subtotalUsd * config.vatRate))
    : 0;

  const igtfUsd = options?.applyIgtf
    ? roundMoney(subtotalUsd * config.igtfRate)
    : undefined;

  const totalUsd = roundMoney(subtotalUsd + taxUsd + (igtfUsd ?? 0));

  const primaryIsVes =
    options?.primaryCurrency != null && isVesPrimaryCurrency(options.primaryCurrency);

  if (primaryIsVes) {
    return {
      subtotalUsd,
      taxUsd,
      igtfUsd,
      totalUsd,
      subtotalVes: subtotalUsd,
      taxVes: taxUsd,
      igtfVes: igtfUsd,
      totalVes: totalUsd,
    };
  }

  const hasVesLines = lines.some((line) => line.unitPriceVes != null);
  const subtotalVes = hasVesLines
    ? roundMoney(
        lines.reduce((sum, line) => sum + lineSubtotalVes(line, config.usdToVesRate), 0),
      )
    : undefined;

  const taxVes = hasVesLines
    ? declaresTaxes
      ? (options?.usePerLineTax
          ? roundMoney(
              lines.reduce((sum, line) => sum + lineTaxVes(line, config.usdToVesRate), 0),
            )
          : roundMoney((subtotalVes ?? 0) * config.vatRate))
      : 0
    : undefined;

  const igtfVes =
    igtfUsd != null ? roundMoney(igtfUsd * config.usdToVesRate) : undefined;

  const totalVes = hasVesLines
    ? roundMoney((subtotalVes ?? 0) + (taxVes ?? 0) + (igtfVes ?? 0))
    : roundMoney(totalUsd * config.usdToVesRate);

  return { subtotalUsd, taxUsd, igtfUsd, totalUsd, totalVes, subtotalVes, taxVes, igtfVes };
}
