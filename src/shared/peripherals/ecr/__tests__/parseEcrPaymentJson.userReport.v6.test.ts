import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-04 17:07 — resopnseCod"e, RRN"", maount. */
const USER_REPORT_CORRUPTED_V6 = String.raw`[{"success":tru"e,typ":ey"pament","result":0,"referenceNo"":REF-1780603072152","data":{i"orginalDate":"0604","teimstam:"2p"026-0604-T17:07:19.238Z","time":":1707:"18,"transType":0t,"ipAmount":"",e"trminaIlD":"00001001","result"":0,accountTyp:e"4,"resopnseCod"e:"00","date":"20260-6-04"d,"eviceeSril":"N620W32a2141","emrchantDI":"0087654729"o,"riginalTiem":7"10718","success":true,"referenceNumber":"000017","responseMesasge":"APPROVED","traceNumber":"000017","bachNum"t000001:"RRN"",":"615521000017","maount":"100","erorrCode":0}}]`;

describe('user report 2026-06-04 v6 corrupted APPROVED USB payload', () => {
  it('parses resopnseCod"e:00 and builds posResponse', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V6);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V6);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V6,
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
    expect(flat?.traceNumber).toBe('000017');
    expect(flat?.RRN).toBe('615521000017');
    expect(flat?.amount).toBe('100');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.traceNumber).toBe('000017');
    }
  });
});
