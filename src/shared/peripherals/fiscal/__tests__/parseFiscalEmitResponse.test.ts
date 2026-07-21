import { parseFiscalEmitEnvelope } from '../parseFiscalEmitResponse';

const SUCCESS_BODY = {
  success: true,
  apiVersion: '1',
  serviceVersion: '0.01.0',
  data: {
    issuedInvoiceNumber: 42,
    lastInvoiceNumber: 41,
    expectedInvoiceNumber: 42,
    traceLog: 'ENQ OK',
  },
  message: 'Factura 42 emitida correctamente',
  error: null,
};

const VALIDATION_BODY = {
  success: false,
  apiVersion: '1',
  serviceVersion: '0.01.0',
  data: {
    validationErrors: ['rif es obligatorio'],
  },
  message: 'rif es obligatorio',
  error: 'rif es obligatorio',
};

describe('parseFiscalEmitEnvelope', () => {
  it('parses successful emit response', () => {
    const envelope = parseFiscalEmitEnvelope(SUCCESS_BODY);

    expect(envelope.success).toBe(true);
    expect(envelope.data?.issuedInvoiceNumber).toBe(42);
    expect(envelope.data?.traceLog).toBe('ENQ OK');
  });

  it('parses validation error response', () => {
    const envelope = parseFiscalEmitEnvelope(VALIDATION_BODY);

    expect(envelope.success).toBe(false);
    expect(envelope.data?.validationErrors).toEqual(['rif es obligatorio']);
  });
});
