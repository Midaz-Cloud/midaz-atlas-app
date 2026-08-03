/**
 * Intermediate POS replies that must NOT settle a pending payment/settlement.
 * Without this filter, a "device busy" / result -97 can resolve the promise
 * with garbage before the real approval payload arrives.
 */
export function isTransientEcrResponse(payload: string): boolean {
  const text = payload.trim();
  if (!text) {
    return false;
  }
  return (
    text.includes('"Device is busy') ||
    text.includes('Device is busy') ||
    text.includes('busy processing') ||
    /"result"\s*:\s*-97\b/.test(text) ||
    /"result"\s*:\s*"?-97"?/.test(text)
  );
}
