/**
 * Thermal printer uses CP1252 over ESC/POS. UTF-8 / accented text often prints as garbage (e.g. CJK).
 * All dynamic text sent to the printer must pass through this helper.
 */
const EXPLICIT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['\u00A0', ' '],
  ['\u202F', ' '],
  ['ñ', 'n'],
  ['Ñ', 'N'],
  ['¿', '?'],
  ['¡', '!'],
  ['°', 'o'],
  ['×', 'x'],
  ['–', '-'],
  ['—', '-'],
  ['‘', "'"],
  ['’', "'"],
  ['“', '"'],
  ['”', '"'],
  ['…', '...'],
  ['€', 'EUR'],
  ['¢', 'c'],
  ['£', 'GBP'],
];

/** Printable ASCII plus line breaks and tab (ESC/POS safe). */
const SAFE_PRINTER_CHAR = /[\t\n\r\x20-\x7E]/;

export function sanitizePrinterText(text: string): string {
  let result = text;
  for (const [from, to] of EXPLICIT_REPLACEMENTS) {
    result = result.split(from).join(to);
  }

  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let sanitized = '';
  for (const char of result) {
    sanitized += SAFE_PRINTER_CHAR.test(char) ? char : '';
  }
  return sanitized;
}
