import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import {
  extractEcrErrorCodeFromText,
  extractEcrResponseCodeFromText,
  parseEcrPaymentJson,
} from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Logcat 2026-07-21 14:21 — cobro OK (errorCode:0) pero frontend error:
 * flat=null porque respons,eCode / raceNumber no matcheaban.
 */
const USER_REPORT_CORRUPTED_2026_07_21_1421 = String.raw`{"success":true,"type":"payment","result":0,"referenceNo":"REF-1784661712348","data":{"originalDate":"07a21","timestmp":"2026-07-21T15:21:54.961Z","time":"15:21:54","transType":0,"tipAmount":"","terminalID":""00001001",result":0,""accountType:2,"respons,eCode":"00""date":"2026-07-21","deviceSerial":"N620W312565","merchantID":"0078513748","originalTime":"152154","success":true,u"referenceNmber":"0000s09","responeMessage":"tAPPROVED","raceNumber":"000076","batchNum":"000004","RRN":"620219000076","amount":"737","errorCode":0}}`;

describe('parseEcrPaymentJson 2026-07-21 14:21 corrupted POS', () => {
  it('rejects strict JSON.parse but builds flat via heuristic', () => {
    expect(() => JSON.parse(USER_REPORT_CORRUPTED_2026_07_21_1421)).toThrow();

    expect(extractEcrErrorCodeFromText(USER_REPORT_CORRUPTED_2026_07_21_1421)).toBe(0);
    expect(extractEcrResponseCodeFromText(USER_REPORT_CORRUPTED_2026_07_21_1421)).toBe('00');

    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_2026_07_21_1421);
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.errorCode).toBe(0);
    expect(flat?.traceNumber).toBe('000076');
    expect(flat?.RRN).toBe('620219000076');
    expect(flat?.amount).toBe('737');
  });

  it('approves payment and builds order POS payload (no payment-error screen)', () => {
    expect(parseEcrPaymentResponse(USER_REPORT_CORRUPTED_2026_07_21_1421).approved).toBe(true);

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_2026_07_21_1421,
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
    expect(pos.payload.posResponse.RRN).toBe('620219000076');
    expect(pos.payload.posResponse.traceNumber).toBe('000076');
    expect(pos.payload.posResponse.amount).toBe('737');
  });
});
