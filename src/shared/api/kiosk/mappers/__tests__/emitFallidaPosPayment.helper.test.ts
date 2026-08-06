import fs from 'fs';

import { buildPosPaymentFromEcr } from '../cardPaymentFromEcr';

/**
 * Helper invocado por scripts/simulateFallidaLiveOrder.js.
 * Solo corre con RUN_EMIT_FALLIDA_POS=1.
 */
const run = process.env.RUN_EMIT_FALLIDA_POS === '1';

(run ? describe : describe.skip)('emitFallidaPosPayment helper', () => {
  it('escribe CardPaymentPayload desde raw dañado', () => {
    const rawPath = process.env.FALLIDA_RAW_PATH;
    const customerPath = process.env.FALLIDA_CUSTOMER_PATH;
    const amountCents = Number.parseInt(process.env.FALLIDA_AMOUNT_CENTS || '0', 10);
    const documentId = process.env.FALLIDA_DOCUMENT_ID || '26728807';
    const outPath = process.env.FALLIDA_POS_OUT;

    expect(rawPath).toBeTruthy();
    expect(customerPath).toBeTruthy();
    expect(outPath).toBeTruthy();
    expect(amountCents).toBeGreaterThan(0);

    const raw = fs.readFileSync(rawPath!, 'utf8');
    const customer = JSON.parse(fs.readFileSync(customerPath!, 'utf8'));

    const result = buildPosPaymentFromEcr({
      rawEcrResponse: raw,
      customer,
      payerDocumentId: documentId,
      paymentMethodId: 'pos',
      amountSentCents: amountCents,
      skipSideEffects: true,
    });

    fs.writeFileSync(outPath!, JSON.stringify(result, null, 2), 'utf8');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.posResponse.amount).toBe(String(amountCents));
      expect(result.payload.posResponse.responseCode).toBe('00');
    }
  });
});
