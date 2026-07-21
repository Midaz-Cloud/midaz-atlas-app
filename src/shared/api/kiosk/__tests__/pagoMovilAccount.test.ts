import {
  formatPagoMovilBankLine,
  isPagoMovilAccountConfigured,
  mapPagoMovilAccountToDisplay,
  sanitizePagoMovilName,
  generatePagoMovilQrCode,
} from '../pagoMovilAccount';
import { mockPagoMovilAccount } from '../mock/mockPagoMovilAccount';

describe('pagoMovilAccount', () => {
  it('formats bank with ABVC code', () => {
    expect(formatPagoMovilBankLine(mockPagoMovilAccount)).toBe('Banco Activo (0171)');
  });

  it('maps account fields for display', () => {
    expect(mapPagoMovilAccountToDisplay(mockPagoMovilAccount)).toEqual({
      bank: 'Banco Activo (0171)',
      phone: '04142251008',
      documentId: 'J412438905',
      holder: 'COCHI CRUNCH C.A.',
    });
  });

  it('detects configured account', () => {
    expect(isPagoMovilAccountConfigured(mockPagoMovilAccount)).toBe(true);
    expect(isPagoMovilAccountConfigured(null)).toBe(false);
    expect(
      isPagoMovilAccountConfigured({
        bank: '',
        bankCode: '',
        phone: '',
        cedula: '',
        holder: '',
      }),
    ).toBe(false);
  });

  it('sanitizes name according to backend rules', () => {
    expect(sanitizePagoMovilName('DISTRIBUIDORA GLOBAL DE INSUMOS XXI C.A.')).toBe(
      'DISTRIBUIDORA GLOBAL DE INSUMO',
    );
    expect(sanitizePagoMovilName('Polar C.A.')).toBe('Polar CA');
    expect(sanitizePagoMovilName('A-B&C.D')).toBe('ABCD');
  });

  it('generates QR code from endpoint', async () => {
    const mockQr = 'data:image/png;base64,mockbase64data';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ qrCode: mockQr, success: true }),
    });

    const qr = await generatePagoMovilQrCode(mockPagoMovilAccount, 10.5);
    expect(qr).toBe(mockQr);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/kiosk/generate-payment-qr'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"amountVES":"10.50"'),
      }),
    );
  });
});
