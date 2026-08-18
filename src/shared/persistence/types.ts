/** Failed-payment persistence types (SQLite registry for admin). */

import type {
  CardPaymentPayload,
  MobilePaymentPayload,
} from '@shared/kiosk-order/types';
import type { KioskOrderModifierSelection } from '@shared/api/kiosk/types';

export type FailedPaymentStage =
  | 'pos_charge'
  | 'pos_parse'
  | 'reserve'
  | 'order_register'
  | 'fiscal'
  | 'mobile_validate'
  | 'unknown';

export type FailedPaymentCustomerSnapshot = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  customerId?: number;
};

export type FailedPaymentOrderLineSnapshot = {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitPriceVes?: number;
  taxRate?: number;
  isExempt?: boolean;
  /** Needed so an order retry rebuilds the same total the POS charged. */
  appliedModifiers?: KioskOrderModifierSelection[];
};

export type FailedPaymentOrderSnapshot = {
  lines: FailedPaymentOrderLineSnapshot[];
  totals: {
    totalVes?: number;
    totalUsd?: number;
    subtotalVes?: number;
    taxVes?: number;
  };
  reservationId?: string | null;
  orderType?: string;
  tableNumber?: string | null;
  /** Midaz display number when POST /kiosk/orders already succeeded. */
  displayOrderNumber?: string;
  shortCode?: string | null;
  /** HkaApp number already printed — retry must not re-emit. */
  fiscalInvoiceNumber?: number;
};

export type FailedPaymentMethodSnapshot = {
  paymentMethod?: string;
  posReference?: string;
  mobileReference?: string;
  bankCode?: string;
  bankName?: string;
  cedula?: string;
  phone?: string;
  /** Full POS payload when available — lets an order retry re-POST as charged. */
  cardPayment?: CardPaymentPayload;
  /** Pago móvil already validated — retry must not re-validate or re-charge. */
  mobilePayment?: MobilePaymentPayload;
};

export type FailedPaymentInput = {
  stage: FailedPaymentStage;
  paymentMethod?: string;
  errorReason: string;
  errorMessage: string;
  customer?: FailedPaymentCustomerSnapshot | null;
  order?: FailedPaymentOrderSnapshot | null;
  payment?: FailedPaymentMethodSnapshot | null;
  rawJson?: string | null;
};

/**
 * Recovery lifecycle of a failed_payments row.
 * `retry_pending` marks a row taken for order retry before the POST fires
 * (at-most-once); a crash leaves it stuck there for manual re-arm.
 */
export type FailedPaymentStatus =
  | 'open'
  | 'salvaged'
  | 'retry_pending'
  | 'retried_ok'
  | 'retry_failed'
  | 'dismissed';

/** Recovery artifacts stored in failed_payments.salvage_json. */
export type FailedPaymentSalvageInfo = {
  /** POS payload reconstructed from raw_json by the current parser. */
  payload?: CardPaymentPayload;
  /** Row inserted into pos_successful_transactions during salvage. */
  posTransactionId?: number;
  /** Backend order number when the retry POST succeeded. */
  displayOrderNumber?: string;
  retryError?: string;
  note?: string;
};

export type FailedPaymentSummary = {
  id: number;
  displayRef: string;
  createdAt: string;
  status: FailedPaymentStatus;
};

export type FailedPaymentRecord = FailedPaymentSummary & {
  stage: FailedPaymentStage;
  paymentMethod: string | null;
  errorReason: string;
  errorMessage: string;
  customerJson: string | null;
  orderJson: string | null;
  paymentJson: string | null;
  rawJson: string | null;
  statusUpdatedAt: string | null;
  salvageJson: string | null;
  customer: FailedPaymentCustomerSnapshot | null;
  order: FailedPaymentOrderSnapshot | null;
  payment: FailedPaymentMethodSnapshot | null;
  salvage: FailedPaymentSalvageInfo | null;
};

export const FAILED_PAYMENTS_MAX_ROWS = 200;

/** Successful POS charge stored until batch settlement clears the local lot. */
export type SuccessfulPosTransactionInput = {
  posReference: string;
  rrn?: string;
  traceNumber?: string;
  amount: string;
  amountDisplay: string;
  deviceSerial?: string;
  batchNum?: string;
  cardType?: string;
  rawJson?: string | null;
  /** Optional POS terminal date/time if extracted from ECR. */
  posDateTime?: string | null;
};

export type SuccessfulPosTransactionRecord = {
  id: number;
  createdAt: string;
  posReference: string;
  rrn: string | null;
  traceNumber: string | null;
  amount: string;
  amountDisplay: string;
  deviceSerial: string | null;
  batchNum: string | null;
  cardType: string | null;
  rawJson: string | null;
  posDateTime: string | null;
};
