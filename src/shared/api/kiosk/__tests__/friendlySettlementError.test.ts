import { KioskApiError } from '../errors';
import {
  formatUserFacingError,
  friendlySettlementErrorMessage,
} from '../friendlySettlementError';

describe('friendlySettlementErrorMessage', () => {
  it('maps auth errors', () => {
    const error = new KioskApiError('No estás autenticado (/api/pos/settlements)', 401);
    expect(friendlySettlementErrorMessage(error)).toMatch(/autenticar/i);
  });

  it('maps cannot post / 404 without exposing path', () => {
    const error = new KioskApiError(
      'Cannot POST /api/api/pos/settlements (/api/pos/settlements)',
      404,
    );
    const msg = friendlySettlementErrorMessage(error);
    expect(msg).not.toMatch(/\/api\//);
    expect(msg).toMatch(/servidor/i);
  });

  it('maps missing POS serial', () => {
    const error = new KioskApiError('Falta el serial del POS', 400);
    expect(friendlySettlementErrorMessage(error)).toMatch(/serial del datáfono/i);
  });
});

describe('formatUserFacingError', () => {
  it('prefixes with Ocurrió un error', () => {
    expect(formatUserFacingError('Revisa la red e intenta de nuevo.')).toBe(
      'Ocurrió un error. Revisa la red e intenta de nuevo.',
    );
  });

  it('does not double-prefix', () => {
    expect(formatUserFacingError('Ocurrió un error. Ya registrado.')).toBe(
      'Ocurrió un error. Ya registrado.',
    );
  });
});
