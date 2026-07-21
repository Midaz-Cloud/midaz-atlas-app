import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-04 16:37 — eresponseCoe d00, tracNumbeer, successr:tue. */
const USER_REPORT_CORRUPTED_V3 = String.raw`["{successr":tue,"type":"payment",esult":0"r,"referenceNo":"FRE-1706054387688","data":{"originaltDae":"0604","timestmp":a"2026-06-04T16:7:31.1837Z","time1":"37:30"6:,"transType":0,"tipAmount":""ter",minaDlI":"00001001","result":,0"accountTyp":4,"eresponseCoe":"d00","date":2026-"06-04","deviceSerial":"N620W322141",me"rchantID":"0087654729","originalTime":"163730","success":true,"referenceNumber":"00001","respo4nsMeessage""AP:PRVOED","tracNumbeer":"000014,"batch"Nu:"m"000001"",RRN":"61552000014"0,"amount":"010","erroCorde":0}}]`;

describe('user report 2026-06-04 v3 corrupted APPROVED USB payload', () => {
  it('parses approval and builds posResponse for order registration', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V3);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V3);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V3,
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
    expect(flat?.traceNumber).toBe('000014');
    expect(flat?.RRN).toBe('615520000014');
    expect(flat?.amount).toBe('010');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.traceNumber).toBe('000014');
      expect(pos.payload.posResponse.RRN).toBe('615520000014');
    }
  });
});
