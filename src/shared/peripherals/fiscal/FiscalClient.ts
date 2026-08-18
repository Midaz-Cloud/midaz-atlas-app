import type {
  EmitFiscalInvoiceRequest,
  EmitFiscalInvoiceResult,
  FiscalHealthOptions,
  FiscalHealthResult,
  FiscalZReportResult,
} from './types';

export interface FiscalClient {
  getHealth(options?: FiscalHealthOptions): Promise<FiscalHealthResult>;
  emitInvoice(request: EmitFiscalInvoiceRequest): Promise<EmitFiscalInvoiceResult>;
  printZReport(): Promise<FiscalZReportResult>;
  readLastZReport(): Promise<FiscalZReportResult>;
}
