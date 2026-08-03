import { FALLIDAS_2026_08_01 } from '@shared/peripherals/ecr/__fixtures__/fallidas.2026-08-01';

import { buildPosPaymentFromEcr } from '../cardPaymentFromEcr';

const CUSTOMER = {
  documentId: 'V26728807',
  firstName: 'Test',
  lastName: 'User',
  phone: '04140000000',
};

/**
 * Compuerta 2 sobre los 7 pagos aprobados registrados como fallidos
 * (export raw_json de failed_payments, 2026-07-31 / 2026-08-01).
 * El payload de orden debe salir sano: amount solo dígitos e igual a lo
 * cobrado, RRN con ≥8 dígitos, referencias presentes.
 */
describe('buildPosPaymentFromEcr — fallidas 2026-08-01 (aprobadas reales)', () => {
  it.each(FALLIDAS_2026_08_01.map((f) => [f.line, f] as const))(
    'línea %i: mapea a payload de orden con campos sanos',
    (_line, fixture) => {
      const result = buildPosPaymentFromEcr({
        rawEcrResponse: fixture.raw,
        customer: CUSTOMER,
        payerDocumentId: '26728807',
        paymentMethodId: 'pos',
        amountSentCents: fixture.amountCents,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      const pos = result.payload.posResponse;
      expect(pos.amount).toMatch(/^\d+$/);
      expect(pos.amount).toBe(String(fixture.amountCents));
      expect(pos.RRN.replace(/\D/g, '').length).toBeGreaterThanOrEqual(8);
      expect(pos.traceNumber).toMatch(/^\d+$/);
      expect(pos.referenceNumber).toMatch(/^\d+$/);
      expect(pos.responseCode).toBe('00');
    },
  );

  it('línea 4 sin amountSentCents: el amount corrupto "2r695631" no viaja al backend', () => {
    const fixture = FALLIDAS_2026_08_01[3];
    const result = buildPosPaymentFromEcr({
      rawEcrResponse: fixture.raw,
      customer: CUSTOMER,
      payerDocumentId: '26728807',
      paymentMethodId: 'pos',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.payload.posResponse.amount).toMatch(/^\d+$/);
    expect(result.payload.posResponse.amount).toBe('2695631');
  });
});
