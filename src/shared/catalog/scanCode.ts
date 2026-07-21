/** Control chars (incl. GS 0x1D) and common HID terminators from laser scanners. */
const SCAN_CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

const SCAN_TERMINATORS = /[\r\n\t]+/g;

const GS_CHAR = '\x1D';

/** Strips Enter/Tab suffix before normalize (HID scanners). */
export function stripScanTerminators(raw: string): string {
  return raw.replace(SCAN_TERMINATORS, '');
}

export function hasScanTerminator(raw: string): boolean {
  return /[\r\n\t]/.test(raw);
}

/**
 * Normalizes scanner input: trim, drop GS1 addendum after GS, remove other control chars.
 * GS (0x1D) often suffixes EAN with extra AI data — catalog stores the main barcode only.
 */
export function normalizeScanCode(raw: string): string {
  let cleaned = stripScanTerminators(raw);
  const gsIndex = cleaned.indexOf(GS_CHAR);
  if (gsIndex >= 0) {
    cleaned = cleaned.slice(0, gsIndex);
  }
  return cleaned.replace(SCAN_CONTROL_CHARS, '').trim().replace(/\s+/g, '');
}
