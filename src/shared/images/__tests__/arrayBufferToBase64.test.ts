import { arrayBufferToBase64 } from '../kioskImageCache';

function bytesOf(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = (i * 31 + 7) & 0xff;
  }
  return bytes;
}

describe('arrayBufferToBase64', () => {
  it.each([0, 1, 2, 3, 4, 5, 24_575, 24_576, 24_577, 100_003])(
    'matches Buffer base64 for %i bytes (incl. chunk borders and padding)',
    (length) => {
      const bytes = bytesOf(length);
      expect(arrayBufferToBase64(bytes.buffer as ArrayBuffer)).toBe(Buffer.from(bytes).toString('base64'));
    },
  );

  it('encodes a 1.5 MB image fast (linear, not quadratic)', () => {
    const bytes = bytesOf(1_500_000);
    const started = Date.now();
    const out = arrayBufferToBase64(bytes.buffer as ArrayBuffer);
    expect(out.length).toBe(Math.ceil(1_500_000 / 3) * 4);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
