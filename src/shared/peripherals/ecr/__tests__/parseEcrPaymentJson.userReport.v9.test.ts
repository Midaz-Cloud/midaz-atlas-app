import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import {
  extractEcrErrorCodeFromText,
  extractEcrResponseCodeFromText,
  parseEcrPaymentJson,
} from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Logcat 2026-07-21 14:29 — cobro OK (errorCode:0 / APPROVED) pero flat=null:
 * responseCoe, trac0eNumber, RRN "6"20219000077.
 */
const USER_REPORT_CORRUPTED_2026_07_21_1429 = String.raw`{"success":true,"type":"paylment","resut":0,"referFenceNo":"RE-1784662173:736","data"{"originalDate":"0721","timestamp":"2026-07-21T15:29:36.905Z","time":"15:29:36","transType"n:0,"tipAmout":"","term0inalID":"0001001","result":0,"accountType":2,d"responseCoe":"00","da7te":"2026-0-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"152936","succesfs":true,"reerenceNumbe,r":"000010""responseMessage":"APPROVED","trac0eNumber":"00077","batc0hNum":"00004","RRN":"6"20219000077,"amount":"737","errorCode":0}}`;

describe('parseEcrPaymentJson 2026-07-21 14:29 corrupted POS', () => {
  it('rejects strict JSON.parse but builds flat via heuristic', () => {
    expect(() => JSON.parse(USER_REPORT_CORRUPTED_2026_07_21_1429)).toThrow();

    expect(extractEcrErrorCodeFromText(USER_REPORT_CORRUPTED_2026_07_21_1429)).toBe(0);
    expect(extractEcrResponseCodeFromText(USER_REPORT_CORRUPTED_2026_07_21_1429)).toBe('00');

    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_2026_07_21_1429);
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.errorCode).toBe(0);
    expect(flat?.traceNumber).toBe('00077');
    expect(flat?.RRN).toBe('620219000077');
    expect(flat?.amount).toBe('737');
  });

  it('approves and builds order POS payload', () => {
    expect(parseEcrPaymentResponse(USER_REPORT_CORRUPTED_2026_07_21_1429).approved).toBe(true);

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_2026_07_21_1429,
      customer: {
        documentId: 'V26728807',
        firstName: 'Test',
        lastName: 'User',
        phone: '04141234567',
      },
      payerDocumentId: '26728807',
      paymentMethodId: 'pos',
    });

    expect(pos.ok).toBe(true);
    if (!pos.ok) {
      return;
    }
    expect(pos.payload.posResponse.responseCode).toBe('00');
    expect(pos.payload.posResponse.RRN).toBe('620219000077');
    expect(pos.payload.posResponse.traceNumber).toBe('00077');
    expect(pos.payload.posResponse.amount).toBe('737');
  });
});
