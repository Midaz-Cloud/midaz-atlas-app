import {
  calculateRifCheckDigit,
  composeDocumentId,
  getDocumentNumberMaxLength,
  isValidDocumentId,
  isValidDocumentNumberForType,
  normalizeDocumentId,
  parseDocumentId,
} from '../documentId';

describe('documentId utils', () => {
  it('parses prefix and numeric part', () => {
    expect(parseDocumentId('v-12.345.678')).toEqual({
      type: 'V',
      number: '12345678',
    });
    expect(parseDocumentId('J123456784')).toEqual({
      type: 'J',
      number: '123456784',
    });
  });

  it('defaults to V when only digits are provided', () => {
    expect(parseDocumentId('12345678')).toEqual({
      type: 'V',
      number: '12345678',
    });
  });

  it('composes full document id', () => {
    expect(composeDocumentId('E', '81234567')).toBe('E81234567');
    expect(normalizeDocumentId('1234567')).toBe('V1234567');
  });

  describe('V — cédula venezolana (7 u 8 dígitos)', () => {
    it('accepts 7 and 8 digits', () => {
      expect(isValidDocumentNumberForType('V', '1234567')).toBe(true);
      expect(isValidDocumentNumberForType('V', '12345678')).toBe(true);
      expect(isValidDocumentId('V12345678')).toBe(true);
    });

    it('rejects other lengths', () => {
      expect(isValidDocumentNumberForType('V', '123456')).toBe(false);
      expect(isValidDocumentNumberForType('V', '123456789')).toBe(false);
    });

    it('limits input length to 8', () => {
      expect(getDocumentNumberMaxLength('V')).toBe(8);
    });
  });

  describe('E — extranjero residente (7 a 9 dígitos)', () => {
    it('accepts 7 to 9 digits', () => {
      expect(isValidDocumentNumberForType('E', '8123456')).toBe(true);
      expect(isValidDocumentNumberForType('E', '81234567')).toBe(true);
      expect(isValidDocumentNumberForType('E', '812345678')).toBe(true);
    });

    it('rejects too short or too long', () => {
      expect(isValidDocumentNumberForType('E', '812345')).toBe(false);
      expect(isValidDocumentNumberForType('E', '8123456789')).toBe(false);
    });
  });

  describe('J — RIF jurídico (8 dígitos + verificador)', () => {
    it('calculates SENIAT check digit', () => {
      expect(calculateRifCheckDigit('J', '12345678')).toBe(4);
    });

    it('accepts valid RIF with check digit', () => {
      expect(isValidDocumentNumberForType('J', '123456784')).toBe(true);
      expect(isValidDocumentId('J123456784')).toBe(true);
    });

    it('rejects wrong check digit or length', () => {
      expect(isValidDocumentNumberForType('J', '123456789')).toBe(false);
      expect(isValidDocumentNumberForType('J', '12345678')).toBe(false);
      expect(isValidDocumentNumberForType('J', '1234567890')).toBe(false);
    });

    it('requires exactly 9 digits', () => {
      expect(getDocumentNumberMaxLength('J')).toBe(9);
    });
  });
});
