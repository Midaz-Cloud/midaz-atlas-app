import { mapCartToCreateOrderRequest } from '../order';
import { buildPosPaymentFromEcr } from '../cardPaymentFromEcr';

/**
 * Regresión: reportado por el usuario (2026-08-27) — "en tarjeta no validamos
 * si es débito o crédito".
 *
 * `PaymentMethodId` del kiosko es 'pos' | 'mobile' | 'cash' | 'zelle': nunca
 * 'credito'. Como `cardPaymentFromEcr` hacía
 * `paymentMethodId === 'credito' ? 'credito' : 'debito'` y
 * `paymentMethodIdToApi` mapea 'pos' → 'debito', TODA venta con tarjeta se
 * facturaba como Tarjeta Débito (catalogo11 05) aunque se pagara con crédito.
 * El tipo lo declara ahora el cliente en la pantalla posterior a "Punto de venta".
 */
const RAW_ECR = JSON.stringify({
  success: true,
  type: 'payment',
  data: {
    responseCode: '00',
    responseMessage: 'APPROVED',
    referenceNumber: '000013',
    traceNumber: '000019',
    RRN: '787859051265',
    terminalID: '00001001',
    deviceSerial: 'N620W322177',
    merchantID: '0087655112',
    accountType: 2,
    batchNum: '000002',
    amount: '918',
  },
});

const customer = {
  documentId: 'V26396697',
  firstName: 'KEIVER',
  lastName: 'PACHECO',
  phone: '04241848823',
};

function buildPayload(paymentMethodId: 'pos' | 'credito') {
  const result = buildPosPaymentFromEcr({
    rawEcrResponse: RAW_ECR,
    customer,
    payerDocumentId: 'V26396697',
    paymentMethodId,
    amountSentCents: 918,
  });
  if (!result.ok) {
    throw new Error(`no se pudo mapear la respuesta del POS: ${result.message}`);
  }
  return result.payload;
}

describe('tipo de tarjeta declarado por el cliente', () => {
  it('crédito llega al backend como paymentMethod credito', () => {
    const cardPayment = buildPayload('credito');
    expect(cardPayment.cardType).toBe('credito');

    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      cardPayment,
    });

    expect(request.paymentMethod).toBe('credito');
    expect(request.cardType).toBe('credito');
  });

  it('débito sigue yendo como debito', () => {
    const cardPayment = buildPayload('pos');
    expect(cardPayment.cardType).toBe('debito');

    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'pos',
      cardPayment,
    });

    expect(request.paymentMethod).toBe('debito');
    expect(request.cardType).toBe('debito');
  });

  it('sin tarjeta el método no se toca', () => {
    const request = mapCartToCreateOrderRequest({
      lines: [],
      paymentMethodId: 'mobile',
    });
    expect(request.paymentMethod).toBe('pago_movil');
  });
});
