import type { BuildSettlementWorkbookParams } from './buildSettlementWorkbook';

/** Mock settlement payload for Home SMTP/Excel smoke test. */
export function getSettlementMailTestParams(): BuildSettlementWorkbookParams {
  return {
    approved: true,
    referenceNo: 'REF-TEST-1785768000000',
    settlementData: {
      responseCode: '00',
      responseMessage: 'APPROVED',
      terminalID: '00001001',
      merchantID: '0078513748',
      deviceSerial: 'N620W304722',
      CreditBatchNo: '000019',
      DebitBatchNo: '000017',
      ExtraBatchNo: '000001',
      totalCreditCardSale: '15000',
      totalDebitCardSale: '98050',
      totalExtraSale: '0',
      totalCreditCardRefund: '0',
      totalDebitCardRefund: '1200',
      totalExtraRefund: '0',
      date: '20260804',
      time: '120000',
      traceNumber: '000001',
      referenceNumber: '888000000601',
    },
    transactions: [
      {
        posReference: '62122000016',
        createdAt: '2026-08-04T15:00:00.000Z',
        amountDisplay: '10.00',
        posDateTime: '04/08/2026 11:00:00',
        rrn: '62122000016',
        traceNumber: '000216',
        batchNum: '000024',
        deviceSerial: 'N620W304722',
        cardType: 'DEBIT',
      },
      {
        posReference: '62122000017',
        createdAt: '2026-08-04T15:05:00.000Z',
        amountDisplay: '25.50',
        posDateTime: '04/08/2026 11:05:00',
        rrn: '62122000017',
        traceNumber: '000217',
        batchNum: '000024',
        deviceSerial: 'N620W304722',
        cardType: 'CREDIT',
      },
      {
        posReference: '62122000018',
        createdAt: '2026-08-04T15:10:00.000Z',
        amountDisplay: '7.25',
        posDateTime: null,
        rrn: null,
        traceNumber: '000218',
        batchNum: '000024',
        deviceSerial: 'N620W304722',
        cardType: null,
      },
    ],
  };
}
