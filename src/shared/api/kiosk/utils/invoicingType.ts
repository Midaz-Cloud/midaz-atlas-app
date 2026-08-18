export type KioskInvoicingType = 'fiscal_machine' | 'digital_invoicing';

export function resolveEffectiveInvoicingType(
  kioskInvoicingType?: string | null,
  organizationInvoicingType?: string | null,
): string | null {
  const kiosk = kioskInvoicingType?.trim() || null;
  const org = organizationInvoicingType?.trim() || null;
  return kiosk ?? org;
}

/** El Z de PP9+ solo aplica a máquina fiscal. Digital/híbrido no llama I0Z. */
export function shouldPrintFiscalZ(effectiveInvoicingType?: string | null): boolean {
  return effectiveInvoicingType === 'fiscal_machine';
}
