import { FALLIDAS_2026_08_01 } from '@shared/peripherals/ecr/__fixtures__/fallidas.2026-08-01';
import {
  getFailedPayment,
  listSuccessfulPosTransactions,
  recordFailedPayment,
  type FailedPaymentInput,
} from '@shared/persistence';

import { salvageFailedPayments } from '../services/salvageFailedPayments';

const DECLINED_RAW =
  '{"success":false,"type":"payment","result":-1,"data":{"responseCode":"05","responseMessage":"DECLINED","errorCode":-1}}';

function failedRowFor(raw: string, totalVes: number): FailedPaymentInput {
  return {
    stage: 'pos_parse',
    paymentMethod: 'pos',
    errorReason: 'pos_parse_failed',
    errorMessage: 'Faltan datos obligatorios en la respuesta del terminal',
    customer: {
      documentId: 'V26728807',
      firstName: 'Test',
      lastName: 'User',
      phone: '04140000000',
    },
    order: {
      lines: [{ productId: 'p-1', quantity: 1, unitPrice: 1 }],
      totals: { totalVes },
    },
    payment: { paymentMethod: 'pos', cedula: '26728807' },
    rawJson: raw,
  };
}

describe('salvageFailedPayments — filas reales de fallidas.txt', () => {
  const seededIds: number[] = [];
  let declinedId = 0;
  let mismatchId = 0;

  beforeAll(async () => {
    for (const fixture of FALLIDAS_2026_08_01) {
      seededIds.push(
        await recordFailedPayment(
          failedRowFor(fixture.raw, fixture.amountCents / 100),
        ),
      );
    }
    declinedId = await recordFailedPayment(failedRowFor(DECLINED_RAW, 100));
    // Aprobada pero el total del snapshot no coincide con lo cobrado → revisión manual.
    mismatchId = await recordFailedPayment(
      failedRowFor(FALLIDAS_2026_08_01[0].raw, 99.99),
    );
  });

  it('reclasifica las 7 aprobadas y deja las dudosas para revisión', async () => {
    const result = await salvageFailedPayments();

    expect(result.scanned).toBe(9);
    expect(result.salvaged.map((s) => s.id).sort()).toEqual(seededIds.sort());
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: declinedId, reason: 'not_approved' }),
        expect.objectContaining({ id: mismatchId, reason: 'amount_mismatch' }),
      ]),
    );

    const lot = await listSuccessfulPosTransactions();
    expect(lot).toHaveLength(7);
    const amounts = lot.map((tx) => tx.amount).sort();
    const expected = FALLIDAS_2026_08_01.map((f) => String(f.amountCents)).sort();
    expect(amounts).toEqual(expected);
    for (const tx of lot) {
      expect(tx.amount).toMatch(/^\d+$/);
      expect(tx.posReference).toBeTruthy();
    }
  });

  it('marca las filas como salvaged con el payload reconstruido (auditoría intacta)', async () => {
    const record = await getFailedPayment(seededIds[0]);
    expect(record?.status).toBe('salvaged');
    expect(record?.salvage?.payload?.posResponse.amount).toBe(
      String(FALLIDAS_2026_08_01[0].amountCents),
    );
    expect(record?.salvage?.posTransactionId).toBeTruthy();
    expect(record?.rawJson).toBe(FALLIDAS_2026_08_01[0].raw);
  });

  it('es idempotente: una segunda corrida no salva ni duplica nada', async () => {
    const second = await salvageFailedPayments();
    expect(second.salvaged).toHaveLength(0);
    expect((await listSuccessfulPosTransactions())).toHaveLength(7);
  });
});
