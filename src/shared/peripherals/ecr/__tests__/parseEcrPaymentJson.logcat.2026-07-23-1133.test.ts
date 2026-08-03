import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * Real AF910 USB payload from logcat 2026-07-23 11:33:55.
 * Terminal approved; flat was null due to `traceNmber` + `"8amount":"73"`.
 */
const LOGCAT_2026_07_23_113355 = `{"success":true,"type":"payment","result"c:0,"refereneNo":"REF-1478482083021","data":{"eoriginalDat":"0723","t2imestamp":"026-07-23T11:33:54.103Z","time":"11:33:53","transType":0,"tipAmount"a:"","terminlID":"00001t001","resul":0,"accountType":2,"responseCode":"00","date":"2026-07-23","deviceSerial":"N620W322141","merchantID":"0087654729","originalTime":"113353","success":true,"referenceNumber":"000012","responseMessage":"APPROVuED","traceNmber":"000157","batchNum":"000018","RRN":"620415000157","8amount":"73","errorCode":0}}`;

describe('parseEcrPaymentJson logcat 2026-07-23 11:33', () => {
  it('approves and extracts flat despite traceNmber + 8amount', () => {
    expect(parseEcrPaymentResponse(LOGCAT_2026_07_23_113355).approved).toBe(true);

    const flat = parseEcrPaymentJson(LOGCAT_2026_07_23_113355);
    expect(flat).not.toBeNull();
    expect(flat?.responseCode).toBe('00');
    expect(flat?.traceNumber).toBe('000157');
    expect(String(flat?.RRN ?? flat?.rrn)).toBe('620415000157');
    expect(String(flat?.amount)).toBe('73');

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: LOGCAT_2026_07_23_113355,
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
  });
});
