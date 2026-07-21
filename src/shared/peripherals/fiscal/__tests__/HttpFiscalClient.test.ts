import { HttpFiscalClient } from '../HttpFiscalClient';
import { resetFiscalClientForTests } from '../createFiscalClient';

jest.mock('@shared/config/fiscal', () => ({
  getFiscalServiceBaseUrl: () => 'http://127.0.0.1:8765',
  shouldUseMockFiscal: () => false,
}));

describe('HttpFiscalClient', () => {
  beforeEach(() => {
    resetFiscalClientForTests();
    global.fetch = jest.fn();
  });

  it('returns envelope on 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        apiVersion: '1',
        serviceVersion: '0.01.0',
        data: { healthy: true, serviceRunning: true, usbConnected: true, transport: 'USB', printerStatusCode: 4, printerReady: true, enqOk: false },
        message: 'OK',
        error: null,
      }),
    });

    const client = new HttpFiscalClient();
    const result = await client.getHealth();

    expect(result.httpStatus).toBe(200);
    expect(result.envelope.data?.healthy).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/v1/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns envelope on 503 without throwing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        apiVersion: '1',
        serviceVersion: '0.01.0',
        data: { healthy: false, serviceRunning: true, usbConnected: false, transport: null, printerStatusCode: -1, printerReady: false, enqOk: false },
        message: 'Impresora fiscal no disponible',
        error: null,
      }),
    });

    const client = new HttpFiscalClient();
    const result = await client.getHealth();

    expect(result.httpStatus).toBe(503);
    expect(result.envelope.success).toBe(false);
    expect(result.envelope.data?.healthy).toBe(false);
  });

  it('appends probe=enq query when requested', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, apiVersion: '1', serviceVersion: '0', data: null, message: null, error: null }),
    });

    const client = new HttpFiscalClient();
    await client.getHealth({ probeEnq: true });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/v1/health?probe=enq',
      expect.any(Object),
    );
  });

  it('emits invoice on POST /v1/invoices/emit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        apiVersion: '1',
        serviceVersion: '0.01.0',
        data: {
          issuedInvoiceNumber: 42,
          lastInvoiceNumber: 41,
          expectedInvoiceNumber: 42,
          traceLog: 'OK',
        },
        message: 'Factura 42 emitida correctamente',
        error: null,
      }),
    });

    const client = new HttpFiscalClient();
    const result = await client.emitInvoice({
      rif: 'J412438905',
      businessName: 'Demo C.A.',
      lines: [{ taxRateCode: 1, price: 1, quantity: 1, description: 'Test' }],
      payments: [{ methodCode: 1, amount: 0 }],
    });

    expect(result.envelope.data?.issuedInvoiceNumber).toBe(42);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/v1/invoices/emit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws FiscalServiceError on emit 400', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        apiVersion: '1',
        serviceVersion: '0.01.0',
        data: { validationErrors: ['rif es obligatorio'] },
        message: 'rif es obligatorio',
        error: 'rif es obligatorio',
      }),
    });

    const client = new HttpFiscalClient();
    await expect(
      client.emitInvoice({
        rif: '',
        businessName: 'Demo',
        lines: [{ price: 1 }],
      }),
    ).rejects.toMatchObject({ message: 'rif es obligatorio', httpStatus: 400 });
  });
});
