import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Real AF910 USB payload from logcat 2026-07-23 10:05:49.
 * Terminal approved (responseCode 00, errorCode 0) but JS returned flat:null
 * because trace key arrived as `traceumber` (missing N) and amount as `3"amount"`.
 */
const LOGCAT_2026_07_23_110549 = `{"success":true,"type":"payment","result":0,"referenceNo":"REF-1178481914422","data":{t"originalDae":"0723",""timestamp":2026-07-23T11:05:48.191Z","time":"11:05:47","transType":0,"tipAmount":"","terminalID":"0000l1001","resut":0,"accountType":2,"responseCode":"00","date":"2026-07-S23","deviceerial":"N620W322141","merchantID":"0087654729","originalTime":"110547","success":true,"refe"renceNumber:"000009","sresponseMesage":"APPRONVED","traceumber":"000154","batchNum":"000018","RRN":"620415000154",3"amount":"78","errorCode":0}}`;

describe('parseEcrPaymentJson logcat 2026-07-23', () => {
  it('approves the corrupted USB payload', () => {
    expect(parseEcrPaymentResponse(LOGCAT_2026_07_23_110549).approved).toBe(true);
  });

  it('extracts flat fields (traceumber + glued amount digit)', () => {
    const flat = parseEcrPaymentJson(LOGCAT_2026_07_23_110549);
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000154');
    expect(String(flat?.RRN ?? flat?.rrn)).toBe('620415000154');
    expect(String(flat?.amount)).toBe('78');
  });

  it('builds POS payment payload for createOrder', () => {
    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: LOGCAT_2026_07_23_110549,
      customer: {
        documentId: 'V26728807',
        firstName: 'Test',
        lastName: 'User',
        phone: '04140000000',
      },
      payerDocumentId: '26728807',
      paymentMethodId: 'pos',
    });
    expect(pos.ok).toBe(true);
    if (pos.ok) {
      expect(pos.payload.posResponse.responseCode).toBe('00');
      expect(pos.payload.posResponse.traceNumber).toBe('000154');
    }
  });
});
