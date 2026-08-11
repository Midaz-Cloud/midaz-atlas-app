import { buildPosPaymentFromEcr } from '../../../api/kiosk/mappers/cardPaymentFromEcr';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** AF910S 2026-08-07 14:58:51 — APPROVED but flat null (RN instead of RRN, empty errorCode). */
const RAW =
  '{"success":true,"type":"payment","result":0,"referenceNo":"REF-1786132716240","data":{"originalDate":"s0807","timetamp":"20268-08-07T15:5:50.319Z","time":"15:58:49","transType":0,"tipAmount":"",":"00001001","res"terminalID,"ult":0accountType":3,"responeCsode"0:"0"",date:""202608--07",dev"eSicerl"ia"N620:W322157","merch7antID":"008654729","originalTime":"155849","success":true,"referenceNumber":"000040","responseMessage":"APPROVED","traceNumbe,r":"000133""batchNum":R"000018","RN":"621919000133","amount":"310","errorCode":}}';

describe('logcat 2026-08-07 14:58:51 APPROVED flat null', () => {
  it('cascade approves', () => {
    expect(parseEcrPaymentResponse(RAW).approved).toBe(true);
  });

  it('builds order payload from RN/APPROVED corruption', () => {
    const built = buildPosPaymentFromEcr({
      rawEcrResponse: RAW,
      customer: {
        documentId: 'V12392007',
        firstName: 'A',
        lastName: 'B',
        phone: '04141234567',
      },
      payerDocumentId: '12392007',
      amountSentCents: 310,
      skipSideEffects: true,
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.payload.posResponse.RRN).toBe('621919000133');
      expect(built.payload.posResponse.amount).toBe('310');
      expect(built.payload.posResponse.traceNumber).toBe('000133');
    }
  });
});
