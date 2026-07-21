import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-04 16:54 — responseCode""00, traceNmberu, maoutn. */
const USER_REPORT_CORRUPTED_V5 = String.raw`[:"{ssucces":terut,"ype":"paymen","rtesult":0,"reference"No:"REF-1780066474087","data":{"originalDate":"0604",times"p":"2026tam-046-0T16:54:10.241Z","time":"16:54:09","transTye":0,"tippAmount":"","termialID":n"00001001","sre":0,"accoultuntTeyp":4,"responseCode""00":,"date"":2026-060-4",d"eviceeSrial":"N620W32141"2,"mrechantID":"0087654729","orignialTime":"165409","usccess":true,"referenceNumber":"000016","sreponseMessage":"APPROVED"",traceNmberu":"000016","Nbatchum":"000001","RRN":"651502000016","maoutn":"100","errorCode":0}}]`;

describe('user report 2026-06-04 v5 corrupted APPROVED USB payload', () => {
  it('parses responseCode""00 and builds posResponse', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V5);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V5);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V5,
      customer: {
        documentId: 'V12345678',
        firstName: 'Test',
        lastName: 'User',
        phone: '04121234567',
      },
      payerDocumentId: 'V12345678',
    });

    expect(approval.approved).toBe(true);
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000016');
    expect(flat?.referenceNumber).toBe('000016');
    expect(flat?.RRN).toBe('651502000016');
    expect(flat?.amount).toBe('100');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.responseMessage).toMatch(/APPROVED/i);
      expect(pos.payload.posResponse.traceNumber).toBe('000016');
    }
  });
});
