export type KioskInvoicingType = 'fiscal_machine' | 'digital_invoicing';

export function resolveEffectiveInvoicingType(
  kioskInvoicingType?: string | null,
  organizationInvoicingType?: string | null,
): string | null {
  const kiosk = kioskInvoicingType?.trim() || null;
  const org = organizationInvoicingType?.trim() || null;
  return kiosk ?? org;
}

/** HkaApp/TFHKA paper: skip only digital-only orgs (invoice is POST /kiosk/orders). */
export function shouldUsePhysicalFiscalPrinter(
  effectiveInvoicingType?: string | null,
): boolean {
  return effectiveInvoicingType !== 'digital_invoicing';
}

/** El Z de PP9+ solo aplica a máquina fiscal. Digital/híbrido no llama I0Z. */
export function shouldPrintFiscalZ(effectiveInvoicingType?: string | null): boolean {
  return effectiveInvoicingType === 'fiscal_machine';
}

/** Correo obligatorio en registro de cliente solo para factura digital HKA. */
export function shouldRequireCustomerEmail(
  effectiveInvoicingType?: string | null,
): boolean {
  return effectiveInvoicingType === 'digital_invoicing';
}
