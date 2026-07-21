import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';

describe('parseDeclaresTaxes', () => {
  it('returns true for boolean and numeric truthy values', () => {
    expect(parseDeclaresTaxes(true)).toBe(true);
    expect(parseDeclaresTaxes(1)).toBe(true);
  });

  it('returns false for boolean and numeric falsy values', () => {
    expect(parseDeclaresTaxes(false)).toBe(false);
    expect(parseDeclaresTaxes(0)).toBe(false);
    expect(parseDeclaresTaxes(null)).toBe(false);
    expect(parseDeclaresTaxes(undefined)).toBe(false);
  });

  it('parses common string values from live APIs', () => {
    expect(parseDeclaresTaxes('true')).toBe(true);
    expect(parseDeclaresTaxes('TRUE')).toBe(true);
    expect(parseDeclaresTaxes('1')).toBe(true);
    expect(parseDeclaresTaxes('false')).toBe(false);
    expect(parseDeclaresTaxes('0')).toBe(false);
    expect(parseDeclaresTaxes('')).toBe(false);
  });
});
