import type { CardPaymentPayload, CartLine, MobilePaymentPayload } from '@shared/kiosk-order/types';
import type { OrderType } from '@modules/introduction/types';
import type { PaymentMethodId } from '@modules/payment/types';
import { getModifierGroup, getModifierOptionById } from '@modules/ordering/modifiers/data/mockToppings';
import { shouldUseMockApi } from '@shared/config/api';

import { getCatalogEntryByLineProductId } from '@shared/catalog/catalogStore';

import type {
  CreateKioskOrderRequest,
  CreateKioskOrderResponse,
  FulfillmentType,
  KioskOrderItemRequest,
  KioskOrderModifierSelection,
} from '../types';
import { orderTypeToFulfillment } from './fulfillment';
import { paymentMethodIdToApi } from './paymentMethod';

export type MapOrderParams = {
  lines: CartLine[];
  orderType?: OrderType;
  /**
   * Fulfillment de la opción que eligió el cliente. Manda sobre `orderType`, que solo
   * distingue dineIn/takeOut y no alcanza desde que los tipos se configuran por panel
   * (dos opciones distintas pueden mapear al mismo par legado).
   */
  fulfillment?: FulfillmentType;
  tableNumber?: string;
  notes?: string;
  paymentMethodId?: PaymentMethodId;
  customerId?: number;
  mobilePayment?: MobilePaymentPayload | null;
  cardPayment?: CardPaymentPayload | null;
  /** When false, items are sent with taxRate 0 so backend totals match kiosk (no IVA). */
  declaresTaxes?: boolean;
  reservationId?: string | null;
  /** HkaApp `issuedInvoiceNumber` after a successful local fiscal emit. */
  fiscalInvoiceNumber?: number;
};

function parseNumericField(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function resolveOrderShortCode(raw: Record<string, unknown>): string | null {
  const candidates: unknown[] = [raw.shortCode];
  const comanda = raw.comanda;
  if (comanda && typeof comanda === 'object') {
    candidates.push((comanda as Record<string, unknown>).shortCode);
  }
  const kitchenOrder = raw.kitchenOrder;
  if (kitchenOrder && typeof kitchenOrder === 'object') {
    candidates.push((kitchenOrder as Record<string, unknown>).shortCode);
  }
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function parseCreateKioskOrderResponse(body: unknown): CreateKioskOrderResponse {
  const raw = body as Record<string, unknown>;
  return {
    id: Number(raw.id ?? 0),
    displayOrderNumber: String(raw.displayOrderNumber ?? ''),
    shortCode: resolveOrderShortCode(raw),
    orderNumber: raw.orderNumber != null ? Number(raw.orderNumber) : undefined,
    status: String(raw.status ?? ''),
    grandTotalVES: parseNumericField(raw.grandTotalVES),
    grandTotalCurrency: parseNumericField(raw.grandTotalCurrency),
    currencyCode: String(raw.currencyCode ?? 'USD'),
    exchangeRate: parseNumericField(raw.exchangeRate),
    taxBreakdown: Array.isArray(raw.taxBreakdown)
      ? raw.taxBreakdown.map((row) => {
          const item = row as Record<string, unknown>;
          return {
            taxRate: parseNumericField(item.taxRate),
            taxAmount: parseNumericField(item.taxAmount),
            baseAmount: parseNumericField(item.baseAmount),
            description: String(item.description ?? ''),
          };
        })
      : undefined,
    kioskDeviceId: raw.kioskDeviceId != null ? String(raw.kioskDeviceId) : undefined,
  };
}

function mapMockLineModifiers(line: CartLine): KioskOrderModifierSelection[] | undefined {
  if (line.modifierSelections?.length) {
    const modifiers = line.modifierSelections.flatMap((selection) => {
      const group = getModifierGroup(selection.groupId);
      return selection.options.flatMap((option) => {
        const meta = getModifierOptionById(option.optionId);
        return Array.from({ length: option.quantity }, () => ({
          groupId: selection.groupId,
          groupName: group?.titleKey ?? selection.groupId,
          optionId: option.optionId,
          optionName: meta?.nameKey ?? option.optionId,
          quantity: 1,
          priceDelta: meta?.priceUsd ?? 0,
        }));
      });
    });
    return modifiers.length > 0 ? modifiers : undefined;
  }

  if (line.modifierIds?.length) {
    return line.modifierIds.map((id) => ({
      groupId: 'extras',
      groupName: 'Extras',
      optionId: id,
      optionName: id,
      quantity: 1,
      priceDelta: 0,
    }));
  }

  return undefined;
}

function resolveLineTaxFields(
  line: CartLine,
  product: { taxRate?: number; isExempt?: boolean },
  declaresTaxes: boolean,
): Pick<KioskOrderItemRequest, 'taxRate' | 'isExempt'> {
  const isExempt = line.isExempt ?? product.isExempt ?? false;
  if (!declaresTaxes) {
    return { taxRate: 0, isExempt };
  }
  return {
    taxRate: line.taxRate ?? product.taxRate ?? 16,
    isExempt,
  };
}

function mapLineToItem(line: CartLine, declaresTaxes: boolean): KioskOrderItemRequest | null {
  const entry = getCatalogEntryByLineProductId(line.productId);
  if (!entry) {
    return null;
  }
  const { product, apiProductId } = entry;

  const modifiers =
    line.appliedModifiers?.length
      ? line.appliedModifiers
      : shouldUseMockApi()
        ? mapMockLineModifiers(line)
        : undefined;

  const taxFields = resolveLineTaxFields(line, product, declaresTaxes);

  return {
    productId: apiProductId,
    quantity: line.quantity,
    ...taxFields,
    selections: modifiers?.length ? { modifiers } : undefined,
  };
}

export function mapCartToCreateOrderRequest(params: MapOrderParams): CreateKioskOrderRequest {
  const declaresTaxes = params.declaresTaxes ?? false;
  const items = params.lines
    .map((line) => mapLineToItem(line, declaresTaxes))
    .filter((item): item is KioskOrderItemRequest => item != null);

  const uiPaymentMethod = paymentMethodIdToApi(params.paymentMethodId);
  // `paymentMethodIdToApi` mapea 'pos' → 'debito' porque la UI tiene una sola
  // tarjeta de "Punto de venta". El tipo real lo declara el cliente en la
  // pantalla siguiente y viaja en `cardPayment.cardType`; es lo que decide el
  // método HKA del backend (tarjeta_dd/catalogo11 05 vs tarjeta_dc/06).
  const paymentMethod =
    uiPaymentMethod === 'debito' && params.cardPayment?.cardType === 'credito'
      ? 'credito'
      : uiPaymentMethod;
  const request: CreateKioskOrderRequest = {
    items,
    fulfillmentType: params.fulfillment ?? orderTypeToFulfillment(params.orderType),
    tableNumber: params.tableNumber,
    notes: params.notes,
    paymentMethod,
    customerId: params.customerId,
  };

  if (paymentMethod === 'pago_movil' && params.mobilePayment) {
    request.bankCode = params.mobilePayment.bankCode;
    request.reference = params.mobilePayment.reference;
    request.cedula = params.mobilePayment.cedula;
    request.phone = params.mobilePayment.phone;
  }

  if (
    (paymentMethod === 'debito' || paymentMethod === 'credito') &&
    params.cardPayment
  ) {
    request.posResponse = params.cardPayment.posResponse;
    request.cardType = params.cardPayment.cardType;
    request.cedula = params.cardPayment.cedula;
    if (params.cardPayment.cardHolder) {
      request.cardHolder = params.cardPayment.cardHolder;
    }
    if (params.cardPayment.phone) {
      request.phone = params.cardPayment.phone;
    }
  }

  if (params.reservationId) {
    request.reservationId = params.reservationId;
  }

  if (
    typeof params.fiscalInvoiceNumber === 'number' &&
    Number.isInteger(params.fiscalInvoiceNumber) &&
    params.fiscalInvoiceNumber > 0
  ) {
    request.fiscalInvoiceNumber = params.fiscalInvoiceNumber;
  }

  return request;
}
