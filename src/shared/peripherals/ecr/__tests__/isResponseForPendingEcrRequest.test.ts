import { isResponseForPendingEcrRequest } from '../isResponseForPendingEcrRequest';

// Payloads reales del AF910 + N620W322177 (2026-09-23 16:23): la respuesta de la
// consulta de versión llegó dos veces y la segunda copia resolvía el pago.
const VERSION_REPLY =
  '{"success":true,"type":"version","result":0,"referenceNo":"VERCHK-1790194957482","data":{"veslcVersionCode":117,"veslcVersionName":"VESLC20260819001","veslcInstalled":true,"appVersionCode":15,"appVersionName":"1.0.6"}}';
const PAYMENT_REPLY =
  '{"success":true,"type":"payment","result":0,"referenceNo":"REF-1790194958054","data":{"datetime":"2026-09-23T16:23:07","responseMessage":"CANCELLED_NO_RESPONSE","success":false}}';

const pendingPayment = { referenceNo: 'REF-1790194958054', type: 'payment' };

describe('isResponseForPendingEcrRequest', () => {
  it('ignora una copia tardía de la respuesta de versión mientras espera el pago', () => {
    expect(isResponseForPendingEcrRequest(VERSION_REPLY, pendingPayment)).toBe(false);
  });

  it('acepta la respuesta de su propio pago', () => {
    expect(isResponseForPendingEcrRequest(PAYMENT_REPLY, pendingPayment)).toBe(true);
  });

  it('ignora la respuesta de un pago anterior (otro referenceNo)', () => {
    expect(
      isResponseForPendingEcrRequest(PAYMENT_REPLY, {
        referenceNo: 'REF-1790194750708',
        type: 'payment',
      }),
    ).toBe(false);
  });

  it('acepta payloads dañados sin referenceNo ni type legibles', () => {
    expect(
      isResponseForPendingEcrRequest('{"success":true,"result":0,"data":{"approv', pendingPayment),
    ).toBe(true);
  });

  it('no confunde cardType con type', () => {
    expect(
      isResponseForPendingEcrRequest(
        '{"success":true,"result":0,"referenceNo":"REF-1790194958054","data":{"cardType":"DEBITO"}}',
        pendingPayment,
      ),
    ).toBe(true);
  });
});
