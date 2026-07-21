/** Normaliza `declaresTaxes` del backend (boolean, string, number) a boolean. */
export function parseDeclaresTaxes(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0 || value == null) {
    return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no' ||
      normalized === ''
    ) {
      return false;
    }
  }
  return Boolean(value);
}
