import { resolveOrderSuccessDisplayMode } from '../resolveOrderSuccessDisplayMode';

describe('resolveOrderSuccessDisplayMode', () => {
  it('uses P15 QR when printQrEnabled is true', () => {
    expect(resolveOrderSuccessDisplayMode(true)).toBe('qr');
  });

  it('uses P14 order number when printQrEnabled is false', () => {
    expect(resolveOrderSuccessDisplayMode(false)).toBe('number');
  });
});
