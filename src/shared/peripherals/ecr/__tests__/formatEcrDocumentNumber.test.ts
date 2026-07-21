import { formatEcrDocumentNumber } from '../formatEcrDocumentNumber';

describe('formatEcrDocumentNumber', () => {
  it('keeps 7-digit values', () => {
    expect(formatEcrDocumentNumber('1234567')).toBe('1234567');
  });

  it('pads shorter numeric strings to 7 digits', () => {
    expect(formatEcrDocumentNumber('42')).toBe('0000042');
  });

  it('keeps 8-digit cédulas without truncating the first digit', () => {
    expect(formatEcrDocumentNumber('26396697')).toBe('26396697');
    expect(formatEcrDocumentNumber('12345678')).toBe('12345678');
  });

  it('keeps up to 9 digits (E/J)', () => {
    expect(formatEcrDocumentNumber('123456789')).toBe('123456789');
  });

  it('strips non-digits from prefixed ids', () => {
    expect(formatEcrDocumentNumber('K-1234567')).toBe('1234567');
    expect(formatEcrDocumentNumber('V26396697')).toBe('26396697');
  });

  it('falls back to 7 digits when input has no numbers', () => {
    const result = formatEcrDocumentNumber('TEST-HOME');
    expect(result).toMatch(/^\d{7}$/);
  });
});
