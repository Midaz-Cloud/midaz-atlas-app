import type {
  EmitFiscalInvoiceRequest,
  EmitFiscalInvoiceResult,
  FiscalHealthOptions,
  FiscalHealthResult,
} from './types';

export interface FiscalClient {
  getHealth(options?: FiscalHealthOptions): Promise<FiscalHealthResult>;
  emitInvoice(request: EmitFiscalInvoiceRequest): Promise<EmitFiscalInvoiceResult>;
}
