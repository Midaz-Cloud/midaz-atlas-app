import { buildPosPaymentFromEcr } from '@shared/api/kiosk/mappers/cardPaymentFromEcr';

import {
  fuzzyExtractAmount,
  fuzzyExtractTraceNumber,
} from '../fuzzyEcrFieldExtract';
import { parseEcrPaymentJson } from '../parseEcrPaymentJson';
import { parseEcrPaymentResponse } from '../parseEcrPaymentResponse';

/**
 * logcat 2026-07-23 11:38 — new corruption shape after prior typo patches:
 * `traceNu5mber`, `amount":"738e"`, `errorCod`.
 * Fix must be fuzzy (Conviase), not another one-off typo.
 */
const LOGCAT_1138 = `{"success":true,"type":"payment","result":0,"referenc7eNo":"REF-184821091900o","data":{"riginalDatei":"0723","tmestamp":"2026-07-23T11:38:33.558Z","time":"11:38:32","transType":0,"tipAmount":"","termina0lID":"0000101","result":0,"accountType":4,"responseCode":"00","date"3:"2026-07-2","deviceSerial":"N620W322141","me0rchantID":"087654729","originalTime":"113832","success":true,"referenceNumber":"000014","responseMessaEge":"APPROVD","traceNu5mber":"00019","batchNum":"000018","RRN":"620415000159","amount":"738e","errorCod":0}}`;

describe('fuzzy ECR extract (Conviase-style) logcat 11:38', () => {
  it('extracts traceNu5mber and amount 738e as digits', () => {
    expect(fuzzyExtractTraceNumber(LOGCAT_1138)).toBe('00019');
    expect(fuzzyExtractAmount(LOGCAT_1138)).toBe('738');
    expect(fuzzyExtractAmount('{"noamount":1}', 738)).toBe('738');
  });

  it('builds POS payload with amountSentCents fallback', () => {
    expect(parseEcrPaymentResponse(LOGCAT_1138).approved).toBe(true);
    const flat = parseEcrPaymentJson(LOGCAT_1138, { amountSentCents: 738 });
    expect(flat).not.toBeNull();
    expect(flat?.traceNumber).toBe('00019');
    expect(String(flat?.amount)).toBe('738');
    expect(String(flat?.RRN ?? flat?.rrn)).toBe('620415000159');

    const pos = buildPosPaymentFromEcr({
      rawEcrResponse: LOGCAT_1138,
      customer: {
        documentId: 'V26728807',
        firstName: 'A',
        lastName: 'B',
        phone: '1',
      },
      payerDocumentId: '26728807',
      amountSentCents: 738,
    });
    expect(pos.ok).toBe(true);
  });
});
