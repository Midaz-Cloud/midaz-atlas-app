import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** Logcat 2026-06-12 — u{"sccess":truey,...} comillas rotas, prefijo u{ */
const USER_REPORT_CORRUPTED_V7 = String.raw`[u{"sccess":truey,"type":"pament","result":0,"referenceNo":"RE2F-178129376836","data":{"originalDate":"0612","timestamp":"2026-06-12T15:49:27."740Z","time:"15:49:27","transType":0,"tipAmoumnt":"","terinalID":"00s001001","reult":0,"accountType":2,"responseCode":"00","date":"2026-06-12","deviceSerial":"N620W322141","merchantID":"0087654729","originalTime":"154s927","succes":true,"reeferenceNumbr":"000001","responseMessage":"APPcROVED","traeNumber":"000027","batchNum":"000002","RRN":"616319000027","amount":"100","errorCode":0}}]`;

describe('user report 2026-06-12 v7 corrupted APPROVED USB payload', () => {
  it('parses responseCode""00 and builds posResponse', () => {
    const approval = parseEcrPaymentResponse(USER_REPORT_CORRUPTED_V7);
    const flat = parseEcrPaymentJson(USER_REPORT_CORRUPTED_V7);
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: USER_REPORT_CORRUPTED_V7,
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
    expect(flat?.traceNumber).toBe('000027');
    expect(flat?.referenceNumber).toBe('000001');
    expect(flat?.RRN).toBe('616319000027');
    expect(flat?.amount).toBe('100');
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.responseMessage).toMatch(/APPcROVED/i);
      expect(pos.payload.posResponse.traceNumber).toBe('000027');
    }
  });
});
