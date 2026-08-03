import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import {
  fuzzyExtractRrn,
  fuzzyExtractTraceNumber,
  resolvePosIdentityFields,
} from '../fuzzyEcrFieldExtract';
import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Real AF910 USB payload from logcat 2026-07-31 15:33:11.
 * Terminal approved (00 / errorCode:0); flat was null due to:
 * - `t:raceNumber""000216` (colon in key, missing : before value)
 * - `RRN"2:"62122000016` (junk digit between key and value)
 */
const LOGCAT_2026_07_31_153311 = `{"success":true,"type":"payment","result":0,"re"ferenceNo":REF-1785529985025","data":{"origin3alDate":"071","timestamp":"2026-07-31T16:33:09.099Z","time":"16:33:08","transType":0,"tipAmount":"","t"erminalID":00001001","aresult":0,"ccountType":2,"responseCode":"00",6"date":"202-07-31","deviceSerial":"N620W304722","merchantID":"0078513748","originalTime":"163308","success":true,"referenceNumber":"000004","responseMessage":"APPROVED","t:raceNumber""000216","b0atchNum":"00013","RRN"2:"62122000016","amount":"671967","errorCode":0}}`;

describe('parseEcrPaymentJson logcat 2026-07-31 15:33', () => {
  it('extracts t:raceNumber and RRN"2: via value anchors', () => {
    expect(fuzzyExtractTraceNumber(LOGCAT_2026_07_31_153311)).toBe('000216');
    expect(fuzzyExtractRrn(LOGCAT_2026_07_31_153311)).toBe('62122000016');

    const identity = resolvePosIdentityFields(LOGCAT_2026_07_31_153311, 671967);
    expect(identity).not.toBeNull();
    expect(identity?.traceNumber).toBe('000216');
    expect(identity?.RRN).toBe('62122000016');
    expect(identity?.amount).toBe('671967');
  });

  it('approves and builds POS payload despite broken trace/RRN keys', () => {
    expect(parseEcrPaymentResponse(LOGCAT_2026_07_31_153311).approved).toBe(true);

    const flat = parseEcrPaymentJson(LOGCAT_2026_07_31_153311, {
      amountSentCents: 671967,
    });
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000216');
    expect(String(flat?.RRN ?? flat?.rrn)).toBe('62122000016');
    expect(String(flat?.amount)).toBe('671967');
    expect(String(flat?.batchNum)).toBe('00013');

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: LOGCAT_2026_07_31_153311,
      customer: {
        documentId: 'V26728807',
        firstName: 'Test',
        lastName: 'User',
        phone: '04140000000',
      },
      payerDocumentId: '26728807',
      paymentMethodId: 'pos',
      amountSentCents: 671967,
    });
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.traceNumber).toBe('000216');
      expect(pos.payload.posResponse.RRN).toBe('62122000016');
      expect(pos.payload.posResponse.amount).toBe('671967');
    }
  });
});
