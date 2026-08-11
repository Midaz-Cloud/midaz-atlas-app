import { buildPosPaymentFromEcr } from '../../../api/kiosk/mappers/cardPaymentFromEcr';
import {
  fuzzyExtractAmount,
  fuzzyExtractRrn,
  fuzzyExtractTraceNumber,
  resolvePosIdentityFields,
} from '../fuzzyEcrFieldExtract';
import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Exact corrupt USB body from kiosk logcat 2026-08-07 10:39:31.
 * Cascade approved; heuristic previously returned null → payment-error after POS charge.
 */
const RAW_LOGCAT_2026_08_07_103931 =
  '{"success":true,"type":"payment","result":0,"referenceNo":"REF-17861171a65872","dat":{"origina7lDate":"080","timestamp":"2026-08-07T11:39:28.893Z","time":"11:39:28","transType":0,"tipAmount":"","terminalID":"00001001","result":0,"accountType":C2,"responseode":"00","-date":"202608-07","deviceSerial":"N620W322157","merchantID":"0087654729","originalTime":"113928","succeferenceNumber":"000023","responseMessage":"APPROVED","tress":true,"r"aceNumber":000116","batchNum":"000018","RRN":"62191500016","amount"1:"118","errorCode":0}}';

describe('logcat 2026-08-07 10:39 POS after charge screen', () => {
  it('approves via cascade', () => {
    const { approved, message } = parseEcrPaymentResponse(RAW_LOGCAT_2026_08_07_103931);
    expect(approved).toBe(true);
    expect(message).toBe('APPROVED');
  });

  it('extracts identity fields with amountSentCents', () => {
    expect(fuzzyExtractRrn(RAW_LOGCAT_2026_08_07_103931)).toBeTruthy();
    expect(fuzzyExtractAmount(RAW_LOGCAT_2026_08_07_103931, 118)).toBe('118');
    expect(fuzzyExtractTraceNumber(RAW_LOGCAT_2026_08_07_103931)).toBeTruthy();
    const identity = resolvePosIdentityFields(RAW_LOGCAT_2026_08_07_103931, 118);
    expect(identity).not.toBeNull();
  });

  it('extracts flat and builds order payload with amountSentCents', () => {
    const flat = parseEcrPaymentJson(RAW_LOGCAT_2026_08_07_103931, {
      amountSentCents: 118,
    });
    expect(flat).not.toBeNull();
    const built = buildPosPaymentFromEcr({
      rawEcrResponse: RAW_LOGCAT_2026_08_07_103931,
      customer: {
        documentId: 'V26728807',
        firstName: 'A',
        lastName: 'B',
        phone: '04141234567',
      },
      payerDocumentId: '26728807',
      paymentMethodId: 'pos',
      amountSentCents: 118,
      skipSideEffects: true,
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.payload.posResponse.responseCode).toBe('00');
      expect(built.payload.posResponse.amount).toBe('118');
      expect(built.payload.posResponse.RRN.replace(/\D/g, '').length).toBeGreaterThanOrEqual(8);
    }
  });
});
