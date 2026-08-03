import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

import { FALLIDAS_2026_08_01 } from '../__fixtures__/fallidas.2026-08-01';

/**
 * Compuerta 1 sobre los 7 pagos aprobados que el kiosco registró como
 * fallidos (feria 2026-07-31 / 2026-08-01). Todos traen APPROVED /
 * responseCode 00 / errorCode 0 con claves corruptas por USB.
 */
describe('parseEcrPaymentResponse — fallidas 2026-08-01 (aprobadas reales)', () => {
  it.each(FALLIDAS_2026_08_01.map((f) => [f.line, f] as const))(
    'línea %i: el terminal aprobó y la compuerta 1 debe aprobar',
    (_line, fixture) => {
      const result = parseEcrPaymentResponse(fixture.raw);
      expect(result.approved).toBe(true);
    },
  );
});
