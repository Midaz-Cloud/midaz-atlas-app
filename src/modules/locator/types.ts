export const LOCATOR_CODE_LENGTH = 2;

export function isValidLocatorCode(value: string): boolean {
  return new RegExp(`^\\d{${LOCATOR_CODE_LENGTH}}$`).test(value.trim());
}
