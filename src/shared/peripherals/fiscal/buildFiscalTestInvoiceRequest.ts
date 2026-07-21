import { truncateFiscalField } from './fiscalText';
import type { EmitFiscalInvoiceRequest } from './types';

export type BuildFiscalTestInvoiceParams = {
  rif: string;
  businessName: string;
  address?: string;
  /** Si false, linea exenta (taxRateCode 0). Default true para prueba con IVA 16%. */
  declaresTaxes?: boolean;
};

/** Factura minima de prueba para validar impresion fiscal real via HkaApp. */
export function buildFiscalTestInvoiceRequest(
  params: BuildFiscalTestInvoiceParams,
): EmitFiscalInvoiceRequest {
  const declaresTaxes = params.declaresTaxes ?? true;
  const taxRateCode = declaresTaxes ? 1 : 0;

  return {
    rif: truncateFiscalField(params.rif, 38),
    businessName: truncateFiscalField(params.businessName, 34),
    ...(params.address ? { address: truncateFiscalField(params.address, 40) } : {}),
    mixedPayments: false,
    applyIgtf: false,
    lines: [
      {
        taxRateCode,
        price: 1.0,
        quantity: 1,
        description: truncateFiscalField('Producto prueba kiosco', 40),
      },
    ],
    payments: [{ methodCode: 1, amount: 0 }],
  };
}
