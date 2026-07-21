import { createFiscalClient } from './createFiscalClient';
import type { EmitFiscalInvoiceRequest } from './types';

/** Emite factura fiscal via POST /v1/invoices/emit (HkaApp). */
export async function emitFiscalInvoice(request: EmitFiscalInvoiceRequest) {
  const client = createFiscalClient();
  const result = await client.emitInvoice(request);
  return result.envelope;
}
