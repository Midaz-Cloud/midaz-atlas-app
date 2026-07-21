import type { PaymentMethodId } from '@modules/payment/types';

import type { CardPaymentPayload, CartLine } from '@shared/kiosk-order/types';

import type { KioskOrderModifierSelection } from '@shared/api/kiosk/types';

import { getCatalogEntryByLineProductId } from '@shared/catalog/catalogStore';

import { normalizeDocumentId } from '@shared/api/kiosk/utils/documentId';

import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';

import { isVesPrimaryCurrency } from '@shared/pricing/kioskPricing';



import { truncateFiscalField } from './fiscalText';

import type { EmitFiscalInvoiceRequest, FiscalInvoiceLine, FiscalInvoicePayment } from './types';



export type MapOrderToFiscalInvoiceParams = {

  lines: CartLine[];

  customerDocumentId: string;

  customerName: string;

  customerAddress?: string;

  paymentMethodId?: string;

  cardPayment?: CardPaymentPayload | null;

  primaryCurrency?: string;

  usdToVesRate: number;

  declaresTaxes?: boolean;

};



function roundMoney(amount: number): number {

  return Math.round(amount * 100) / 100;

}



function primaryAmountToFiscalVes(

  amountPrimary: number,

  line: CartLine,

  primaryCurrency: string,

  usdToVesRate: number,

): number {

  if (isVesPrimaryCurrency(primaryCurrency)) {

    return roundMoney(amountPrimary);

  }

  if (line.unitPriceVes != null && line.unitPrice > 0) {

    return roundMoney((amountPrimary * line.unitPriceVes) / line.unitPrice);

  }

  return roundMoney(amountPrimary * usdToVesRate);

}



function lineBaseFiscalUnitPriceVes(

  line: CartLine,

  primaryCurrency: string,

  usdToVesRate: number,

): number {

  return primaryAmountToFiscalVes(line.unitPrice, line, primaryCurrency, usdToVesRate);

}



/** PP9+ GF+ quantity supports up to 3 decimals (e.g. 2 toppings → qty 2,000). */

export function formatFiscalModifierDescription(

  optionName: string,

  quantity: number,

): string {

  const baseName = optionName.trim() || 'Extra';

  const label = quantity > 1 ? `${baseName} ×${quantity}` : baseName;

  return truncateFiscalField(label, 40);

}



function buildFiscalLine(
  description: string,
  priceVes: number,
  quantity: number,
  taxRateCode: number,
): FiscalInvoiceLine | null {
  if (priceVes <= 0) {
    return null;
  }
  return {
    taxRateCode,
    price: priceVes,
    quantity,
    description: truncateFiscalField(description, 40),
  };
}

/** Free modifiers (quota slots, included toppings) are excluded from the fiscal invoice. */
export function isPaidModifierForFiscal(modifier: KioskOrderModifierSelection): boolean {
  return modifier.priceDelta > 0 && modifier.quantity > 0;
}

function mapModifierToFiscalLine(
  modifier: KioskOrderModifierSelection,
  line: CartLine,
  primaryCurrency: string,
  usdToVesRate: number,
  taxRateCode: number,
): FiscalInvoiceLine | null {
  if (!isPaidModifierForFiscal(modifier)) {
    return null;
  }



  const unitPriceVes = primaryAmountToFiscalVes(

    modifier.priceDelta,

    line,

    primaryCurrency,

    usdToVesRate,

  );



  return buildFiscalLine(

    formatFiscalModifierDescription(modifier.optionName, modifier.quantity),

    unitPriceVes,

    modifier.quantity,

    taxRateCode,

  );

}



/** Maps product tax rate to PP9+ taxRateCode (0 exento, 1 general 16%, 2 reducida, 3 adicional). */

export function mapLineTaxRateToFiscalCode(

  line: CartLine,

  productTaxRate: number | undefined,

  productIsExempt: boolean | undefined,

  declaresTaxes: boolean,

): number {

  if (!declaresTaxes) {

    return 0;

  }

  if (line.isExempt ?? productIsExempt) {

    return 0;

  }

  const rate = line.taxRate ?? productTaxRate ?? 16;

  if (rate <= 0) {

    return 0;

  }

  if (rate <= 8) {

    return 2;

  }

  if (rate <= 16) {

    return 1;

  }

  if (rate <= 31) {

    return 3;

  }

  return 1;

}



export function mapPaymentMethodToFiscalCode(

  paymentMethodId: PaymentMethodId | string | undefined,

  cardPayment?: CardPaymentPayload | null,

): number {

  if (paymentMethodId === 'mobile') {

    return 13;

  }

  if (paymentMethodId === 'cash') {

    return 1;

  }

  if (paymentMethodId === 'pos' || cardPayment) {

    return cardPayment?.cardType === 'credito' ? 3 : 2;

  }

  return 1;

}



function mapCartLineToFiscalLines(

  line: CartLine,

  primaryCurrency: string,

  usdToVesRate: number,

  declaresTaxes: boolean,

): FiscalInvoiceLine[] {

  const entry = getCatalogEntryByLineProductId(line.productId);

  if (!entry) {

    return [];

  }



  const taxRateCode = mapLineTaxRateToFiscalCode(

    line,

    entry.product.taxRate,

    entry.product.isExempt,

    declaresTaxes,

  );



  const productDescription =

    entry.product.displayName ??

    entry.product.nameKey ??

    `Producto ${entry.apiProductId}`;



  const basePriceVes = lineBaseFiscalUnitPriceVes(line, primaryCurrency, usdToVesRate);

  const baseLine = buildFiscalLine(

    productDescription,

    basePriceVes,

    line.quantity,

    taxRateCode,

  );



  const fiscalLines: FiscalInvoiceLine[] = baseLine ? [baseLine] : [];



  const modifiers = line.appliedModifiers ?? [];

  for (const modifier of modifiers) {

    const modifierLine = mapModifierToFiscalLine(

      modifier,

      line,

      primaryCurrency,

      usdToVesRate,

      taxRateCode,

    );

    if (modifierLine) {

      fiscalLines.push(modifierLine);

    }

  }



  return fiscalLines;

}



export function shouldEmitFiscalInvoice(declaresTaxes?: unknown): boolean {

  return parseDeclaresTaxes(declaresTaxes);

}



export function mapOrderToFiscalInvoiceRequest(

  params: MapOrderToFiscalInvoiceParams,

): EmitFiscalInvoiceRequest | null {

  if (!shouldEmitFiscalInvoice(params.declaresTaxes)) {

    return null;

  }



  const rif = normalizeDocumentId(params.customerDocumentId);

  const businessName = params.customerName.trim();

  if (!rif || !businessName) {

    return null;

  }



  const primaryCurrency = params.primaryCurrency ?? 'USD';

  const declaresTaxes = params.declaresTaxes ?? false;



  const lines = params.lines.flatMap((line) =>

    mapCartLineToFiscalLines(line, primaryCurrency, params.usdToVesRate, declaresTaxes),

  );



  if (lines.length === 0) {

    return null;

  }



  const methodCode = mapPaymentMethodToFiscalCode(

    params.paymentMethodId,

    params.cardPayment,

  );

  const payments: FiscalInvoicePayment[] = [{ methodCode, amount: 0 }];



  return {

    rif: truncateFiscalField(rif, 38),

    businessName: truncateFiscalField(businessName, 34),

    ...(params.customerAddress

      ? { address: truncateFiscalField(params.customerAddress, 40) }

      : {}),

    mixedPayments: false,

    applyIgtf: false,

    lines,

    payments,

  };

}


