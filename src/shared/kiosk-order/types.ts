import type { KioskOrderModifierSelection, KioskPosResponse } from '@shared/api/kiosk/types';
import type { ModifierOptionQuantity } from '@shared/modifiers/modifierSelectionTypes';

export type { ModifierOptionQuantity, GroupSelection, UnitModifierSelections } from '@shared/modifiers/modifierSelectionTypes';

export type ModifierSelection = {
  groupId: string;
  options: ModifierOptionQuantity[];
};

export type CartLine = {
  lineId: string;
  productId: string;
  quantity: number;
  /** Base unit price in organization primary currency (product.price). */
  unitPrice: number;
  unitPriceVes?: number;
  taxRate?: number;
  isExempt?: boolean;
  /** Surcharge from modifiers for the whole line (per unit line, qty typically 1). */
  modifierSurchargePrimary?: number;
  /** Resolved rows for POST /kiosk/orders selections.modifiers. */
  appliedModifiers?: KioskOrderModifierSelection[];
  /** @deprecated Prefer modifierSelections */
  modifierIds?: string[];
  modifierSelections?: ModifierSelection[];
};

export type OrderTotals = {
  subtotalUsd: number;
  taxUsd: number;
  igtfUsd?: number;
  totalUsd: number;
  totalVes: number;
  /** Sum of line Bs subtotals when API provides priceVES; not FX-converted. */
  subtotalVes?: number;
  /** IVA in Bs (per-line on unitPriceVes or FX from taxUsd). */
  taxVes?: number;
  igtfVes?: number;
};

export type OrderFiscalConfig = {
  vatRate: number;
  igtfRate: number;
  usdToVesRate: number;
};

/** Snapshot fijo al pasar de P8 (checkout) a payment. */
export type KioskOrderCheckoutSnapshot = {
  lines: CartLine[];
  totals: OrderTotals;
  usdToVesRate: number;
  primaryCurrency: string;
};

export type ComputeOrderTotalsOptions = {
  applyIgtf?: boolean;
  usePerLineTax?: boolean;
  /** When VES, bolívar totals mirror primary amounts (no FX conversion). */
  primaryCurrency?: string;
  declaresTaxes?: boolean;
};

export type ConfirmedOrderTotals = {
  displayOrderNumber: string;
  grandTotalCurrency: number;
  grandTotalVES: number;
  currencyCode: string;
};

/** Set after successful POST /kiosk/validate-payment for pago_movil. */
export type MobilePaymentPayload = {
  bankCode: string;
  bankName: string;
  reference: string;
  cedula: string;
  phone: string;
  disglobalRef?: string | null;
};

/** Set after successful POS payment, sent with POST /kiosk/orders for debito/credito. */
/** Tipo de tarjeta declarado por el cliente en el kiosko. */
export type CardKind = 'debito' | 'credito';

export type CardPaymentPayload = {
  posResponse: KioskPosResponse;
  cardType: string;
  cedula: string;
  cardHolder?: string;
  phone?: string;
  /** RRN or trace — shown if order registration fails after terminal approval. */
  posReference: string;
};
