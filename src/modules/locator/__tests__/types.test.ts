import { isValidLocatorCode, LOCATOR_CODE_LENGTH } from '../types';

describe('locator types', () => {
  it('requires exactly two digits', () => {
    expect(LOCATOR_CODE_LENGTH).toBe(2);
    expect(isValidLocatorCode('12')).toBe(true);
    expect(isValidLocatorCode('1')).toBe(false);
    expect(isValidLocatorCode('123')).toBe(false);
    expect(isValidLocatorCode('1a')).toBe(false);
  });
});
