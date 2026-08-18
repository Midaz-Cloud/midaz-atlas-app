import { buildSettlementFromEcr, toPersistableSettlementRequest } from '../buildSettlementFromEcr';

const POS_CIERRE_EXAMPLE = JSON.stringify({
  success: true,
  type: 'settlement',
  result: 0,
  referenceNo: 'REF-1781294570906',
  data: {
    totalExtraRefund: '0',
    totalDebitCardRefund: '0',
    traceNumber: '000001',
    totalCreditCardRefund: '0',
    responseCode: '00',
    CreditBatchNo: '000002',
    merchantID: '0087654729',
    transType: 0,
    accountType: 0,
    totalDebitCardSale: '0',
    tipAmount: '',
    time: '160253',
    deviceSerial: 'N620W322141',
    terminalID: '00001001',
    result: 0,
    amount: null,
    ExtraBatchNo: '000001',
    totalCreditCardSale: '0',
    totalExtraSale: '0',
    DebitBatchNo: '000001',
    date: '20260612',
    success: true,
    referenceNumber: '888000000601',
    responseMessage: 'APPROVED',
    errorCode: 0,
  },
});

describe('buildSettlementFromEcr', () => {
  it('maps approved POS settlement to POST /kiosk/settlement request', () => {
    const result = buildSettlementFromEcr(POS_CIERRE_EXAMPLE);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.request.success).toBe(true);
    expect(result.request.settlementId).toBe('REF-1781294570906');
    expect(result.request.settlementData?.deviceSerial).toBe('N620W322141');
    expect(result.request.settlementData?.CreditBatchNo).toBe('000002');
    expect(result.request.settlementData?.DebitBatchNo).toBe('000001');
    expect(result.request.settlementData?.ExtraBatchNo).toBe('000001');
    expect(result.request.settlementData?.responseCode).toBe('00');
    expect(result.request.settlementData?.responseMessage).toBe('APPROVED');
    expect(result.request.settlementData?.traceNumber).toBe('000001');
    expect(result.request.settlementData?.referenceNumber).toBe('888000000601');
  });

  it('returns failure request with posSerial fallback when parse fails', () => {
    const result = buildSettlementFromEcr('not-json', {
      posSerialFallback: 'N620W322141',
    });

    expect(result.ok).toBe(false);
    expect(result.request?.success).toBe(false);
    expect(result.request?.posSerial).toBe('N620W322141');
  });

  it('persists salvaged USB fields when structured parse fails', () => {
    const parsed = buildSettlementFromEcr('not-json', {
      posSerialFallback: '00000000',
    });
    const persist = toPersistableSettlementRequest(parsed, {
      referenceNo: 'REF-1787018394386',
      settlementData: {
        responseCode: '00',
        responseMessage: 'APPROVED',
        deviceSerial: 'N620W322141',
        DebitBatchNo: '000002',
        CreditBatchNo: '000019',
      },
    });

    expect(parsed.ok).toBe(false);
    expect(persist?.success).toBe(true);
    expect(persist?.settlementId).toBe('REF-1787018394386');
    expect(persist?.posSerial).toBe('N620W322141');
    expect(persist?.settlementData?.deviceSerial).toBe('N620W322141');
  });

  it('does not persist a success:false parse stub', () => {
    const parsed = buildSettlementFromEcr('not-json', {
      posSerialFallback: '00000000',
    });
    expect(toPersistableSettlementRequest(parsed)).toBeUndefined();
  });
});
