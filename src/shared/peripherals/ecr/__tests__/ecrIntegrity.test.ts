import { FALLIDAS_2026_08_01 } from '../__fixtures__/fallidas.2026-08-01';
import { crc32Hex, stringifyWithCrc, verifyEcrCrc } from '../ecrIntegrity';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

describe('ecrIntegrity', () => {
  it('usa el CRC32 estándar (mismo valor que PKUSB)', () => {
    expect(crc32Hex('123456789')).toBe('cbf43926');
  });

  it('valida un mensaje intacto y detecta cualquier byte dañado', () => {
    const line = stringifyWithCrc({ type: 'payment', referenceNo: 'REF-1', data: { amount: 4679916 } });
    expect(verifyEcrCrc(line)).toBe('valid');
    expect(verifyEcrCrc(line.replace('4679916', '4679917'))).toBe('invalid');
    expect(verifyEcrCrc(line.replace('"amount"', '"amou7nt"'))).toBe('invalid');
    expect(verifyEcrCrc(line.replace('"crc"', '"rc"'))).toBe('invalid');
    expect(verifyEcrCrc(line.replace('"crc"', '"cr"'))).toBe('invalid');
  });

  it('sin crc es un PKUSB viejo', () => {
    expect(verifyEcrCrc('{"success":true,"type":"payment"}')).toBe('absent');
  });

  it('el campo crc no rompe el parser de pagos', () => {
    for (const fixture of FALLIDAS_2026_08_01.slice(0, 3)) {
      const parsed = JSON.parse(fixture.raw.replace(/"(amou7nt|referebceNumber)"/g, '"x"')) as object;
      const withCrc = stringifyWithCrc(parsed);
      expect(parseEcrPaymentResponse(withCrc).approved).toBe(
        parseEcrPaymentResponse(JSON.stringify(parsed)).approved,
      );
    }
  });
});
