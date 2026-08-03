import {
  buildSuccessfulPosTransactionInput,
  extractPosDateTimeFromRaw,
  formatSuccessfulPosTicketDateTime,
} from '../posSuccessfulTransactionMappers';
import {
  clearSuccessfulPosTransactions,
  listSuccessfulPosTransactions,
  recordSuccessfulPosTransaction,
} from '../posSuccessfulTransactionsRepo';
import { __setKioskSqliteDbForTests } from '../sqliteDb';

describe('posSuccessfulTransactionMappers', () => {
  it('builds input from card payload and formats cents', () => {
    const input = buildSuccessfulPosTransactionInput({
      payload: {
        posResponse: {
          responseCode: '00',
          responseMessage: 'APPROVED',
          referenceNumber: '000004',
          traceNumber: '000216',
          RRN: '62122000016',
          terminalID: '00001001',
          deviceSerial: 'N620W304722',
          merchantID: '0078513748',
          accountType: 1,
          batchNum: '00013',
          amount: '671967',
        },
        cardType: 'debito',
        cedula: '26728807',
        posReference: '62122000016',
      },
      rawJson: '{"date":"20260731","time":"163308","amount":"671967"}',
    });

    expect(input.posReference).toBe('62122000016');
    expect(input.amountDisplay).toBe('6719.67');
    expect(input.deviceSerial).toBe('N620W304722');
    expect(input.posDateTime).toBe('31/07/2026 16:33:08');
  });

  it('formats YYYYMMDD date from raw ECR', () => {
    expect(extractPosDateTimeFromRaw('{"date":"20260731","time":"163308"}')).toBe(
      '31/07/2026 16:33:08',
    );
  });

  it('formats created_at for ticket', () => {
    const formatted = formatSuccessfulPosTicketDateTime('2026-07-31T20:00:00.000Z');
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
  });
});

describe('posSuccessfulTransactionsRepo (mocked sqlite)', () => {
  beforeEach(() => {
    __setKioskSqliteDbForTests(null);
  });

  it('records, lists chronologically, and clears', async () => {
    const id1 = await recordSuccessfulPosTransaction({
      posReference: 'RRN-1',
      amount: '100',
      amountDisplay: '1.00',
      cardType: 'debito',
    });
    const id2 = await recordSuccessfulPosTransaction({
      posReference: 'RRN-2',
      amount: '250',
      amountDisplay: '2.50',
      cardType: 'debito',
    });

    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(id1);

    const list = await listSuccessfulPosTransactions();
    expect(list.map((r) => r.posReference)).toEqual(['RRN-1', 'RRN-2']);

    await clearSuccessfulPosTransactions();
    expect(await listSuccessfulPosTransactions()).toEqual([]);
  });
});
