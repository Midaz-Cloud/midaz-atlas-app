import {
  hasScanTerminator,
  normalizeScanCode,
  stripScanTerminators,
} from '../scanCode';

describe('scanCode', () => {
  it('trims and strips internal whitespace', () => {
    expect(normalizeScanCode(' 7501234567890 ')).toBe('7501234567890');
    expect(normalizeScanCode('75 012 345 67890')).toBe('7501234567890');
  });

  it('returns empty for blank input', () => {
    expect(normalizeScanCode('   ')).toBe('');
    expect(normalizeScanCode('\n\r')).toBe('');
  });

  it('strips GS (0x1D) addendum — keeps main EAN only', () => {
    expect(normalizeScanCode('7592946001362\x1D10')).toBe('7592946001362');
    expect(normalizeScanCode('7592946001362\r\n')).toBe('7592946001362');
  });

  it('detects terminators', () => {
    expect(hasScanTerminator('123\n')).toBe(true);
    expect(hasScanTerminator('123')).toBe(false);
    expect(stripScanTerminators('123\r\n')).toBe('123');
  });
});
