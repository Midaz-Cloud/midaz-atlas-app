import { sanitizePrinterText } from '../sanitizePrinterText';

describe('sanitizePrinterText', () => {
  it('removes accents from Spanish text', () => {
    expect(sanitizePrinterText('Café con leche')).toBe('Cafe con leche');
    expect(sanitizePrinterText('Niño')).toBe('Nino');
    expect(sanitizePrinterText('¿Listo? ¡Sí!')).toBe('?Listo? !Si!');
  });

  it('strips characters outside printable ASCII', () => {
    expect(sanitizePrinterText('Hola 中文 mundo')).toBe('Hola  mundo');
    expect(sanitizePrinterText('emoji 🍦 test')).toBe('emoji  test');
  });

  it('keeps newlines and common ticket punctuation', () => {
    const input = 'Linea 1\nLinea 2\tBs. 1,234.56';
    expect(sanitizePrinterText(input)).toBe(input);
  });
});
