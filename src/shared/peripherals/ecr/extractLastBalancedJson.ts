/**
 * Finds the longest balanced `{...}` object in a USB line that may contain
 * leading/trailing noise (Nexgo/PKBUSB often prefixes garbage before the real JSON).
 * Scans from right to left — same strategy as Conviase UsbSerialModule.
 */
export function extractLastBalancedJson(line: string): string | null {
  const text = line.trim();
  if (!text.includes('{') || !text.includes('}')) {
    return null;
  }

  let best: string | null = null;

  for (let end = text.length - 1; end >= 0; end -= 1) {
    if (text[end] !== '}') {
      continue;
    }

    let depth = 0;
    for (let start = end; start >= 0; start -= 1) {
      const ch = text[start];
      if (ch === '}') {
        depth += 1;
      } else if (ch === '{') {
        depth -= 1;
        if (depth === 0) {
          const candidate = text.slice(start, end + 1);
          if (best == null || candidate.length > best.length) {
            best = candidate;
          }
          break;
        }
      }
    }
  }

  return best;
}
