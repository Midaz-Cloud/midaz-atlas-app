import type { CartLine, OrderTotals } from '@shared/kiosk-order/types';
import type { KioskCustomer } from '@shared/customer/types';
import type {
  CardPaymentPayload,
  MobilePaymentPayload,
} from '@shared/kiosk-order/types';

import type {
  FailedPaymentCustomerSnapshot,
  FailedPaymentInput,
  FailedPaymentMethodSnapshot,
  FailedPaymentOrderSnapshot,
  FailedPaymentStage,
} from './types';

export function formatFailedPaymentDisplayRef(id: number): string {
  return `FP-${String(id).padStart(6, '0')}`;
}

export function safeJsonStringify(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (raw == null || raw === '') {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function snapshotCustomer(
  customer: KioskCustomer | null | undefined,
): FailedPaymentCustomerSnapshot | null {
  if (!customer) {
    return null;
  }
  return {
    customerId: customer.id,
    documentId: customer.documentId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
  };
}

export function snapshotOrder(params: {
  lines: CartLine[];
  totals: OrderTotals;
  reservationId?: string | null;
  orderType?: string;
  tableNumber?: string | null;
}): FailedPaymentOrderSnapshot {
  return {
    lines: params.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      ...(line.unitPriceVes != null ? { unitPriceVes: line.unitPriceVes } : {}),
      ...(line.taxRate != null ? { taxRate: line.taxRate } : {}),
      ...(line.isExempt != null ? { isExempt: line.isExempt } : {}),
      ...(line.appliedModifiers?.length
        ? { appliedModifiers: line.appliedModifiers }
        : {}),
    })),
    totals: {
      totalVes: params.totals.totalVes,
      totalUsd: params.totals.totalUsd,
      ...(params.totals.subtotalVes != null
        ? { subtotalVes: params.totals.subtotalVes }
        : {}),
      ...(params.totals.taxVes != null ? { taxVes: params.totals.taxVes } : {}),
    },
    reservationId: params.reservationId ?? null,
    orderType: params.orderType,
    tableNumber: params.tableNumber ?? null,
  };
}

export function snapshotPayment(params: {
  paymentMethod?: string;
  cardPayment?: CardPaymentPayload | null;
  mobilePayment?: MobilePaymentPayload | null;
  posReference?: string;
  mobileReference?: string;
}): FailedPaymentMethodSnapshot {
  return {
    paymentMethod: params.paymentMethod,
    posReference:
      params.posReference ?? params.cardPayment?.posReference ?? undefined,
    mobileReference:
      params.mobileReference ?? params.mobilePayment?.reference ?? undefined,
    bankCode: params.mobilePayment?.bankCode,
    bankName: params.mobilePayment?.bankName,
    cedula: params.cardPayment?.cedula ?? params.mobilePayment?.cedula,
    phone: params.cardPayment?.phone ?? params.mobilePayment?.phone,
    ...(params.cardPayment ? { cardPayment: params.cardPayment } : {}),
  };
}

export type FailedPaymentKioskContext = {
  customer?: KioskCustomer | null;
  lines: CartLine[];
  totals: OrderTotals;
  reservationId?: string | null;
  paymentMethod?: string;
  cardPayment?: CardPaymentPayload | null;
  mobilePayment?: MobilePaymentPayload | null;
  orderType?: string;
  tableNumber?: string | null;
};

export function buildFailedPaymentInput(
  context: FailedPaymentKioskContext,
  failure: {
    stage: FailedPaymentStage;
    errorReason: string;
    errorMessage: string;
    rawJson?: string | null;
    posReference?: string;
    mobileReference?: string;
  },
): FailedPaymentInput {
  return {
    stage: failure.stage,
    paymentMethod: context.paymentMethod,
    errorReason: failure.errorReason,
    errorMessage: failure.errorMessage,
    customer: snapshotCustomer(context.customer),
    order: snapshotOrder({
      lines: context.lines,
      totals: context.totals,
      reservationId: context.reservationId,
      orderType: context.orderType,
      tableNumber: context.tableNumber,
    }),
    payment: snapshotPayment({
      paymentMethod: context.paymentMethod,
      cardPayment: context.cardPayment,
      mobilePayment: context.mobilePayment,
      posReference: failure.posReference,
      mobileReference: failure.mobileReference,
    }),
    rawJson: failure.rawJson ?? null,
  };
}
