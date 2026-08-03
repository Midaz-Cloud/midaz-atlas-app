import {
  extractDeviceSerialFromRaw,
  extractSettlementReferenceFromRaw,
  isSettlementApprovedPlainText,
  salvageSettlementDataForPrint,
} from '../settlementApprovalPlainText';

/** Logcat 18:23 — USB corrupt, POS approved settlement, structured parse fails. */
const LOGCAT_CORRUPT_SETTLEMENT_1823 = String.raw`{"success"":true,"type:"settlement","result":0,"referenceNo":"REF-1785540217065","data":{"etotalExtraRfund":"0","ardRefund":"0","totalDebitCratmceNuber":"000001","totalCreditCardRefund":"0","responseCode":"00","CreditBatchNo":"000018","merchantID":"0078513748","0transType":,"accountTylpe":0,"totaDebitCardSale":"0","tipAmount":"","time":"192337","deviceSerial":"N620W304722","terminalID":"00001001","result":0,"amount":null,"ExtraBat0chNo":"00001","totalCreditCardSale":"0","totalExtraSale":"0","DebitBatchNo":"000017","date",:"20260731""success":tnrue,"refereceNumber":"888000000601","responseMessage":"APPROVED","errorCode":0}}`;

describe('isSettlementApprovedPlainText', () => {
  it('detects approval on corrupt settlement logcat', () => {
    expect(isSettlementApprovedPlainText(LOGCAT_CORRUPT_SETTLEMENT_1823)).toBe(true);
  });

  it('rejects negative errorCode', () => {
    expect(isSettlementApprovedPlainText('errorCode":-1,"responseCode":"00"')).toBe(false);
  });

  it('rejects empty / unrelated text', () => {
    expect(isSettlementApprovedPlainText('')).toBe(false);
    expect(isSettlementApprovedPlainText('timeout')).toBe(false);
  });
});

describe('salvageSettlementDataForPrint', () => {
  it('recovers printable fields from corrupt settlement USB payload', () => {
    const { settlementData, referenceNo } = salvageSettlementDataForPrint(
      LOGCAT_CORRUPT_SETTLEMENT_1823,
    );

    expect(referenceNo).toBe('REF-1785540217065');
    expect(settlementData.responseCode).toBe('00');
    expect(settlementData.responseMessage).toBe('APPROVED');
    expect(settlementData.deviceSerial).toBe('N620W304722');
    expect(settlementData.terminalID).toBe('00001001');
    expect(settlementData.merchantID).toBe('0078513748');
    expect(settlementData.CreditBatchNo).toBe('000018');
    expect(settlementData.DebitBatchNo).toBe('000017');
    expect(settlementData.totalCreditCardSale).toBe('0');
    expect(settlementData.totalCreditCardRefund).toBe('0');
    expect(settlementData.time).toBe('192337');
  });

  it('uses posSerial fallback when serial missing', () => {
    const { settlementData } = salvageSettlementDataForPrint('responseCode":"00","APPROVED"', {
      posSerialFallback: 'FALLBACK01',
    });
    expect(settlementData.deviceSerial).toBe('FALLBACK01');
  });
});

describe('extract helpers', () => {
  it('extracts REF and serial', () => {
    expect(extractSettlementReferenceFromRaw(LOGCAT_CORRUPT_SETTLEMENT_1823)).toBe(
      'REF-1785540217065',
    );
    expect(extractDeviceSerialFromRaw(LOGCAT_CORRUPT_SETTLEMENT_1823)).toBe('N620W304722');
  });
});
