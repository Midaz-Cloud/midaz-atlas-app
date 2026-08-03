/** Failed-payment persistence types (SQLite registry for admin). */

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
};

export type FailedPaymentMethodSnapshot = {
  paymentMethod?: string;
  posReference?: string;
  mobileReference?: string;
  bankCode?: string;
  bankName?: string;
  cedula?: string;
  phone?: string;
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

export type FailedPaymentSummary = {
  id: number;
  displayRef: string;
  createdAt: string;
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
  customer: FailedPaymentCustomerSnapshot | null;
  order: FailedPaymentOrderSnapshot | null;
  payment: FailedPaymentMethodSnapshot | null;
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
