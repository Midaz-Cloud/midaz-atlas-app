import { parseBooleanEnv } from '../env';

describe('parseBooleanEnv', () => {
  it('returns true only for literal "true"', () => {
    expect(parseBooleanEnv('true')).toBe(true);
  });

  it('returns false for other values', () => {
    expect(parseBooleanEnv('false')).toBe(false);
    expect(parseBooleanEnv('')).toBe(false);
    expect(parseBooleanEnv(undefined)).toBe(false);
    expect(parseBooleanEnv('TRUE')).toBe(false);
    expect(parseBooleanEnv('1')).toBe(false);
  });
});
