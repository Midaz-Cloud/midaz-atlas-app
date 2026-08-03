import {
  buildFailedPaymentInput,
  formatFailedPaymentDisplayRef,
  safeJsonParse,
  snapshotOrder,
} from '../failedPaymentMappers';
import {
  getFailedPayment,
  listFailedPaymentSummaries,
  recordFailedPayment,
} from '../failedPaymentsRepo';
import { __setKioskSqliteDbForTests } from '../sqliteDb';

describe('failedPaymentMappers', () => {
  it('formats display refs with zero padding', () => {
    expect(formatFailedPaymentDisplayRef(1)).toBe('FP-000001');
    expect(formatFailedPaymentDisplayRef(216)).toBe('FP-000216');
  });

  it('builds input snapshot from kiosk context', () => {
    const input = buildFailedPaymentInput(
      {
        customer: {
          id: 1,
          documentId: 'V26728807',
          firstName: 'Alex',
          lastName: 'Romero',
          phone: '04141234567',
          email: 'a@b.com',
        },
        lines: [
          {
            lineId: 'l1',
            productId: '2024',
            quantity: 2,
            unitPrice: 10,
            unitPriceVes: 100,
          },
        ],
        totals: {
          subtotalUsd: 1,
          taxUsd: 0,
          totalUsd: 1,
          totalVes: 200,
        },
        reservationId: 'res-1',
        paymentMethod: 'pos',
        orderType: 'takeOut',
      },
      {
        stage: 'pos_charge',
        errorReason: 'declined',
        errorMessage: 'Pago rechazado',
        rawJson: '{"responseCode":"05"}',
      },
    );

    expect(input.stage).toBe('pos_charge');
    expect(input.customer?.documentId).toBe('V26728807');
    expect(input.order?.lines[0]?.productId).toBe('2024');
    expect(input.order?.reservationId).toBe('res-1');
    expect(input.rawJson).toContain('responseCode');
  });

  it('parses JSON safely', () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('not-json')).toBeNull();
    expect(snapshotOrder({
      lines: [],
      totals: { subtotalUsd: 0, taxUsd: 0, totalUsd: 0, totalVes: 0 },
    }).lines).toEqual([]);
  });
});

describe('failedPaymentsRepo (mocked sqlite)', () => {
  beforeEach(() => {
    __setKioskSqliteDbForTests(null);
  });

  it('records and lists failed payments', async () => {
    const id = await recordFailedPayment({
      stage: 'pos_parse',
      paymentMethod: 'pos',
      errorReason: 'pos_parse_failed',
      errorMessage: 'flat null',
      customer: { documentId: 'V1', firstName: 'A', lastName: 'B' },
      order: {
        lines: [{ productId: '1', quantity: 1, unitPrice: 1 }],
        totals: { totalVes: 10 },
      },
      payment: { paymentMethod: 'pos', posReference: 'RRN1' },
      rawJson: '{"amount":"100"}',
    });

    expect(id).toBeGreaterThan(0);

    const summaries = await listFailedPaymentSummaries();
    expect(summaries[0]?.id).toBe(id);
    expect(summaries[0]?.displayRef).toBe(formatFailedPaymentDisplayRef(id));

    const detail = await getFailedPayment(id);
    expect(detail?.errorReason).toBe('pos_parse_failed');
    expect(detail?.customer?.documentId).toBe('V1');
    expect(detail?.rawJson).toContain('amount');
  });
});
