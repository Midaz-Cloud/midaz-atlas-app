/** Envelope JSON de la API fiscal local HkaApp (GET /v1/health, etc.). */
export type FiscalApiEnvelope<T> = {
  success: boolean;
  apiVersion: string;
  serviceVersion: string;
  data: T | null;
  message: string | null;
  error: string | null;
};

export type FiscalHealthData = {
  healthy: boolean;
  serviceRunning: boolean;
  usbConnected: boolean;
  transport: string | null;
  printerStatusCode: number;
  printerReady: boolean;
  enqOk: boolean;
};

export type FiscalHealthOptions = {
  /** Ejecuta `CheckFprinter()` (ENQ) — más lento pero más fiable. */
  probeEnq?: boolean;
};

export type FiscalHealthResult = {
  envelope: FiscalApiEnvelope<FiscalHealthData>;
  httpStatus: number;
};

export type FiscalInvoiceLine = {
  taxRateCode?: number;
  price: number;
  quantity?: number;
  description?: string;
};

export type FiscalInvoicePayment = {
  methodCode: number;
  amount?: number;
};

export type EmitFiscalInvoiceRequest = {
  rif: string;
  businessName: string;
  address?: string;
  applyIgtf?: boolean;
  mixedPayments?: boolean;
  autoRemainderOnLastPayment?: boolean;
  lines: FiscalInvoiceLine[];
  payments?: FiscalInvoicePayment[];
};

export type EmitFiscalInvoiceData = {
  issuedInvoiceNumber: number;
  lastInvoiceNumber: number;
  expectedInvoiceNumber: number;
  traceLog: string;
  validationErrors?: string[];
};

export type EmitFiscalInvoiceResult = {
  envelope: FiscalApiEnvelope<EmitFiscalInvoiceData>;
  httpStatus: number;
};
