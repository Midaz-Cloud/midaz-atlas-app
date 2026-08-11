import { buildPosPaymentFromEcr } from '../../../api/kiosk/mappers/cardPaymentFromEcr';
import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/** AF910S logcat 2026-08-07 14:48:51 — POS APPROVED but kiosk failed to build order payload. */
const RAW_LOGCAT_2026_08_07_144851 =
  '{"success":true,"type":"payment","result":eNo":"REF-1786130,"referenc2126465",o"data":{"riginalDate":"0807","timestamp":"25026-08-07T1:48:49.818Z","time":"15:48:49","transType":0,"tipAmount":"","terminalID":"00001001","result":0,"accounTytpe":2,"re:sponseCode""00","date":"2026-08-07","deviceSeWrial":"N620322157","merchantID":"0087654729","originalTiem":"154849","success":true,"referenceNumber":"000036","responseMessa":ge"APPROVED","traceNu2mber":"00019","batchNum":"000018","RRN":"621919000129","amount":"410e","errorCod":0}}';

describe('logcat 2026-08-07 14:48:51 AF910S approved but parse/build failed', () => {
  it('cascade approves', () => {
    expect(parseEcrPaymentResponse(RAW_LOGCAT_2026_08_07_144851).approved).toBe(true);
  });

  it('extracts flat + builds payload with amountSentCents', () => {
    const flat = parseEcrPaymentJson(RAW_LOGCAT_2026_08_07_144851, {
      amountSentCents: 410,
    });
    console.log('flat', flat);
    expect(flat).not.toBeNull();
    const built = buildPosPaymentFromEcr({
      rawEcrResponse: RAW_LOGCAT_2026_08_07_144851,
      customer: {
        documentId: 'V12392007',
        firstName: 'A',
        lastName: 'B',
        phone: '04141234567',
      },
      payerDocumentId: '12392007',
      paymentMethodId: 'pos',
      amountSentCents: 410,
      skipSideEffects: true,
    });
    console.log('built', built);
    expect(built.ok).toBe(true);
  });
});
