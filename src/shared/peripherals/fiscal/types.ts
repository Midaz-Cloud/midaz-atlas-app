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

/** Campos de auditoría fiscal (FiscalAuditDataDto) + serial de máquina. */
export type FiscalZReportData = {
  fecha: string;
  coo: string;
  venta_bruta: string;
  descuentos: string;
  notas_credito: string;
  venta_neta: string;
  tributados_valor: string;
  tributados_impuesto: string;
  exentos_valor: string;
  percibidos_valor: string;
  notas_credito_valor: string;
  notas_credito_impuesto: string;
  suma_valor: string;
  suma_impuesto: string;
  'imp_igtf03_00%': string;
  'imp_igtf_03_00%': string;
  base_exentos: string;
  base_percibidos: string;
  base_bi_g: string;
  imp_iva_g: string;
  base_bi_r: string;
  imp_iva_r: string;
  base_bi_a: string;
  imp_iva_a: string;
  'nc_imp_igtf03_00%': string;
  'nc_imp_igtf_03_00%': string;
  nc_base_exentos: string;
  nc_base_percibidos: string;
  nc_base_bi_g: string;
  nc_imp_iva_g: string;
  nc_base_bi_r: string;
  nc_imp_iva_r: string;
  nc_base_bi_a: string;
  nc_imp_iva_a: string;
  gran_total: string;
  gran_total_iva: string;
  ult_factura_num: string;
  ult_factura_fecha: string;
  ult_factura_monto: string;
  ult_nota_credito_num: string;
  ult_nota_credito_fecha: string;
  ult_nota_credito_monto: string;
  ult_no_fiscal_num: string;
  ult_no_fiscal_fecha: string;
  ult_no_fiscal_monto: string;
  ult_reporte_z_num: string;
  ult_reporte_z_fecha: string;
  fiscalMachineSerial: string;
};

export type FiscalZReportResult = {
  envelope: FiscalApiEnvelope<FiscalZReportData>;
  httpStatus: number;
};
