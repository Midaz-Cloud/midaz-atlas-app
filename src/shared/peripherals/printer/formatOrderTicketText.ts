import type { OrderType } from '@modules/introduction/types';
import { findCatalogProduct } from '@shared/catalog/catalogStore';
import i18n from '@shared/i18n/i18n';
import type { CartLine, OrderTotals } from '@shared/kiosk-order/types';
import { isVesPrimaryCurrency } from '@shared/pricing/kioskPricing';

import { formatCartLineModifierLines } from './formatCartLineModifierLines';
import {
  formatTicketUsd,
  formatTicketVes,
  layoutProductTicketLines,
  padTicketLine,
} from './ticketLineLayout';

export type FormatOrderTicketParams = {
  displayOrderNumber: string;
  lines: CartLine[];
  totals: OrderTotals;
  usdToVesRate: number;
  primaryCurrency?: string;
  orderType?: OrderType;
  tableNumber?: string;
  /** Printed in native header (`organization.name` from kiosk config). */
  organizationName?: string;
  organizationLegalName?: string;
  declaresTaxes?: boolean;
};

function roundTicketMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function resolveTicketTotalsInVes(
  totals: OrderTotals,
  usdToVesRate: number,
  primaryCurrency?: string,
): {
  subtotalVes: number;
  taxVes: number;
  igtfVes?: number;
  totalVes: number;
} {
  if (primaryCurrency != null && isVesPrimaryCurrency(primaryCurrency)) {
    return {
      subtotalVes: totals.subtotalUsd,
      taxVes: totals.taxUsd,
      igtfVes: totals.igtfUsd,
      totalVes: totals.totalUsd,
    };
  }

  const subtotalVes =
    totals.subtotalVes ?? roundTicketMoney(totals.subtotalUsd * usdToVesRate);
  const taxVes = totals.taxVes ?? roundTicketMoney(totals.taxUsd * usdToVesRate);
  const igtfVes =
    totals.igtfVes ??
    (totals.igtfUsd != null && totals.igtfUsd > 0
      ? roundTicketMoney(totals.igtfUsd * usdToVesRate)
      : undefined);
  const totalVes = roundTicketMoney(
    subtotalVes + taxVes + (igtfVes ?? 0),
  );

  return { subtotalVes, taxVes, igtfVes, totalVes };
}

function resolveOrderTypeLabel(orderType: OrderType): string {
  const key = orderType === 'dineIn' ? 'orderType.dineIn' : 'orderType.takeOut';
  return i18n.t(key, { ns: 'introduction' });
}

export function formatTicketExchangeRateLine(usdToVesRate: number): string {
  const value = usdToVesRate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `Tasa: ${value}`;
}

function resolveProductLabel(productId: string): string {
  const product = findCatalogProduct(productId);
  if (product?.displayName) {
    return product.displayName;
  }
  if (product?.sku) {
    return product.sku;
  }
  return productId;
}

/** Plain-text body for PrinterModule2.printText (header/footer are native). */
function formatTicketLineAmount(amount: number, primaryCurrency?: string): string {
  if (primaryCurrency != null && isVesPrimaryCurrency(primaryCurrency)) {
    return formatTicketVes(amount);
  }
  return formatTicketUsd(amount);
}

export function formatOrderTicketText(params: FormatOrderTicketParams): string {
  const lines: string[] = [];
  const primaryCurrency = params.primaryCurrency;
  lines.push(`ORDEN: ${params.displayOrderNumber}`);

  if (params.orderType) {
    lines.push(`Tipo: ${resolveOrderTypeLabel(params.orderType)}`);
    if (primaryCurrency == null || !isVesPrimaryCurrency(primaryCurrency)) {
      lines.push(formatTicketExchangeRateLine(params.usdToVesRate));
    }
  }
  if (params.tableNumber?.trim()) {
    lines.push(`Mesa: ${params.tableNumber.trim()}`);
  }

  lines.push('--------------------------------');

  for (const line of params.lines) {
    const name = resolveProductLabel(line.productId);
    const right = formatTicketLineAmount(line.unitPrice * line.quantity, primaryCurrency);
    for (const productLine of layoutProductTicketLines(line.quantity, name, right)) {
      lines.push(productLine);
    }
    for (const modifierLine of formatCartLineModifierLines(line)) {
      lines.push(modifierLine);
    }
  }

  lines.push('--------------------------------');

  const totalsVes = resolveTicketTotalsInVes(
    params.totals,
    params.usdToVesRate,
    primaryCurrency,
  );
  const declaresTaxes = params.declaresTaxes ?? false;
  lines.push(padTicketLine('Subtotal:', formatTicketVes(totalsVes.subtotalVes)));
  if (declaresTaxes) {
    lines.push(padTicketLine('IVA:', formatTicketVes(totalsVes.taxVes)));
  }

  if (totalsVes.igtfVes != null && totalsVes.igtfVes > 0) {
    lines.push(padTicketLine('IGTF:', formatTicketVes(totalsVes.igtfVes)));
  }

  lines.push(padTicketLine('Total:', formatTicketVes(totalsVes.totalVes)));

  return lines.join('\n');
}
