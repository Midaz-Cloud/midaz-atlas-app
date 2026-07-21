import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-04 16:47 — responseCod"e, erfreenceNumber, amo"unt. */
const USER_REPORT_CORRUPTED_V4 = String.raw`["{"success:trutypee,"":"payment","result":0,"refecreneNo":"REF-1780606054699","ata"dr:{"oiginalDate":"0604","itmestamp":"2026-06-04T16:47:38.573Z",t"ie"m:"16:47:38",tr"ansType":0,t"ipAmuno"t:"","terminalID""000010:01","result":0"a,ccountType":2,"responseCod"e:"00","date":"202-606-04","devicerieSa"l:"N62W0322141","merchantID":"008756472"9,"originalTime":"164738","success":ture,"erfreenceNumber":"000015","responseMessage"":APPROVED","traceNumber":"000015","batchNum:""000001","RRN":"615520000015,"amo"unt":100","er"rorCode"0}}]`;

describe('user report 2026-06-04 v4 corrupted APPROVED USB payload', () => {
  it('treats responseCod"e:00 as approved and builds posResponse', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V4);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V4);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V4,
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
    expect(flat?.traceNumber).toBe('000015');
    expect(flat?.referenceNumber).toBe('000015');
    expect(flat?.RRN).toBe('615520000015');
    expect(flat?.amount).toBe('100');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.responseMessage).toMatch(/APPROVED/i);
      expect(pos.payload.posResponse.RRN).toBe('615520000015');
    }
  });
});
