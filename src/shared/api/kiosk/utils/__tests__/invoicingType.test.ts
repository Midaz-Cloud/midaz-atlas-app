import {
  resolveEffectiveInvoicingType,
  shouldPrintFiscalZ,
  shouldUsePhysicalFiscalPrinter,
} from '../invoicingType';

describe('resolveEffectiveInvoicingType', () => {
  it('prefers kiosk override over organization type', () => {
    expect(
      resolveEffectiveInvoicingType('fiscal_machine', 'digital_invoicing'),
    ).toBe('fiscal_machine');
  });

  it('falls back to organization type when kiosk is empty', () => {
    expect(resolveEffectiveInvoicingType(null, 'digital_invoicing')).toBe(
      'digital_invoicing',
    );
    expect(resolveEffectiveInvoicingType('  ', 'fiscal_machine')).toBe(
      'fiscal_machine',
    );
  });

  it('returns null when both are missing', () => {
    expect(resolveEffectiveInvoicingType(undefined, undefined)).toBeNull();
  });
});

describe('shouldUsePhysicalFiscalPrinter', () => {
  it('is false only for digital_invoicing', () => {
    expect(shouldUsePhysicalFiscalPrinter('digital_invoicing')).toBe(false);
    expect(shouldUsePhysicalFiscalPrinter('fiscal_machine')).toBe(true);
    expect(shouldUsePhysicalFiscalPrinter('hybrid')).toBe(true);
    expect(shouldUsePhysicalFiscalPrinter(null)).toBe(true);
    expect(shouldUsePhysicalFiscalPrinter(undefined)).toBe(true);
  });
});

describe('shouldPrintFiscalZ', () => {
  it('is true only for fiscal_machine', () => {
    expect(shouldPrintFiscalZ('fiscal_machine')).toBe(true);
    expect(shouldPrintFiscalZ('digital_invoicing')).toBe(false);
    expect(shouldPrintFiscalZ('hybrid')).toBe(false);
    expect(shouldPrintFiscalZ(null)).toBe(false);
    expect(shouldPrintFiscalZ(undefined)).toBe(false);
  });
});
