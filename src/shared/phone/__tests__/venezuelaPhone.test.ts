import {
  composeVenezuelaPhone,
  isValidVenezuelaPhone,
  isValidVenezuelaPhoneParts,
  normalizeVenezuelaPhone,
  parseVenezuelaPhone,
} from '../venezuelaPhone';

describe('venezuelaPhone utils', () => {
  it('parses national format', () => {
    expect(parseVenezuelaPhone('04141234567')).toEqual({
      operatorCode: '414',
      subscriberNumber: '1234567',
    });
  });

  it('parses international E.164 format', () => {
    expect(parseVenezuelaPhone('+58 414-1234567')).toEqual({
      operatorCode: '414',
      subscriberNumber: '1234567',
    });
  });

  it('composes national phone', () => {
    expect(composeVenezuelaPhone('412', '9876543')).toBe('04129876543');
    expect(normalizeVenezuelaPhone('4141234567')).toBe('04141234567');
  });

  it('validates operator and subscriber parts', () => {
    expect(isValidVenezuelaPhoneParts('414', '1234567')).toBe(true);
    expect(isValidVenezuelaPhoneParts('415', '1234567')).toBe(false);
    expect(isValidVenezuelaPhoneParts('414', '123456')).toBe(false);
  });

  it('validates full phone numbers', () => {
    expect(isValidVenezuelaPhone('04141234567')).toBe(true);
    expect(isValidVenezuelaPhone('+584141234567')).toBe(true);
    expect(isValidVenezuelaPhone('04151234567')).toBe(false);
  });
});
