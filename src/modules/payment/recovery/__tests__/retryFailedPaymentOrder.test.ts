import { FALLIDAS_2026_08_01 } from '@shared/peripherals/ecr/__fixtures__/fallidas.2026-08-01';
import {
  getFailedPayment,
  recordFailedPayment,
  updateFailedPaymentStatus,
  type FailedPaymentInput,
} from '@shared/persistence';

import {
  classifyRetryDuplicateRisk,
  retryFailedPaymentOrder,
} from '../services/retryFailedPaymentOrder';
import { salvageFailedPayments } from '../services/salvageFailedPayments';

const mockCreateOrder = jest.fn();
const mockPrintOrderTicket = jest.fn();
const mockEmitOrderFiscalInvoice = jest.fn();

jest.mock('@shared/api/kiosk', () => {
  const actual = jest.requireActual('@shared/api/kiosk');
  return {
    ...actual,
    loadAccessToken: jest.fn(async () => 'test-token'),
    createKioskApiClient: jest.fn(() => ({
      createOrder: (request: unknown) => mockCreateOrder(request),
    })),
  };
});

jest.mock('@shared/peripherals/printer', () => {
  const actual = jest.requireActual('@shared/peripherals/printer');
  return {
    ...actual,
    printOrderTicket: (...args: unknown[]) => mockPrintOrderTicket(...args),
  };
});

jest.mock('@shared/peripherals/fiscal', () => {
  const actual = jest.requireActual('@shared/peripherals/fiscal');
  return {
    ...actual,
    emitOrderFiscalInvoice: (...args: unknown[]) =>
      mockEmitOrderFiscalInvoice(...args),
    shouldEmitFiscalInvoice: actual.shouldEmitFiscalInvoice,
  };
});

const mockCatalogEntry = jest.fn();
jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogEntryByLineProductId: (productId: string) =>
    mockCatalogEntry(productId),
}));

function failedRowFor(raw: string, totalVes: number): FailedPaymentInput {
  return {
    stage: 'pos_parse',
    paymentMethod: 'pos',
    errorReason: 'pos_parse_failed',
    errorMessage: 'Faltan datos obligatorios en la respuesta del terminal',
    customer: {
      documentId: 'V26728807',
      firstName: 'Test',
      lastName: 'User',
      phone: '04140000000',
      customerId: 42,
    },
    order: {
      lines: [{ productId: 'p-1', quantity: 2, unitPrice: 10 }],
      totals: { totalVes },
    },
    payment: { paymentMethod: 'pos', cedula: '26728807' },
    rawJson: raw,
  };
}

describe('retryFailedPaymentOrder', () => {
  beforeEach(() => {
    mockCreateOrder.mockReset();
    mockPrintOrderTicket.mockReset();
    mockEmitOrderFiscalInvoice.mockReset();
    mockCatalogEntry.mockReset();
    mockCatalogEntry.mockImplementation(() => ({
      product: { taxRate: 16, isExempt: false },
      apiProductId: 901,
    }));
    mockPrintOrderTicket.mockResolvedValue(undefined);
    mockEmitOrderFiscalInvoice.mockResolvedValue({ issuedInvoiceNumber: 1 });
  });

  it('reintenta una fila salvada: POST sin reservationId y con el posResponse cobrado', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    await salvageFailedPayments();

    mockCreateOrder.mockResolvedValueOnce({
      displayOrderNumber: 'ORD-777',
      shortCode: 'ABC123',
    });

    const result = await retryFailedPaymentOrder({
      id,
      declaresTaxes: false,
      printQrEnabled: true,
      organizationName: 'Test Org',
    });

    expect(result).toMatchObject({ ok: true, displayOrderNumber: 'ORD-777' });
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockEmitOrderFiscalInvoice).not.toHaveBeenCalled();
    expect(mockPrintOrderTicket).toHaveBeenCalledTimes(1);
    expect(mockPrintOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOrderNumber: 'ORD-777',
        printQrEnabled: true,
        trackShortCode: 'ABC123',
        organizationName: 'Test Org',
      }),
    );
    const request = mockCreateOrder.mock.calls[0][0];
    expect(request.reservationId).toBeUndefined();
    expect(request.items).toHaveLength(1);
    expect(request.items[0]).toMatchObject({ productId: 901, quantity: 2 });
    expect(request.posResponse.amount).toBe(String(fixture.amountCents));
    expect(request.posResponse.amount).toMatch(/^\d+$/);

    // Success deletes the failed_payments row.
    expect(await getFailedPayment(id)).toBeNull();
  });

  it('reintenta fila open pos_parse sin salvage previo (fuerza monto del pedido)', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );

    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-888' });

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: false });

    expect(result).toMatchObject({ ok: true, displayOrderNumber: 'ORD-888' });
    expect(mockPrintOrderTicket).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder.mock.calls[0][0].posResponse.amount).toBe(
      String(fixture.amountCents),
    );
    expect(await getFailedPayment(id)).toBeNull();
  });

  it('si imprime falla tras el POST, la orden queda OK y se limpia el fallido', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-999' });
    mockPrintOrderTicket.mockRejectedValueOnce(new Error('printer offline'));

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.displayOrderNumber).toBe('ORD-999');
      expect(result.printWarning).toBeTruthy();
    }
    expect(await getFailedPayment(id)).toBeNull();
  });

  it('con declaresTaxes emite fiscal antes del POST', async () => {
    const fixture = FALLIDAS_2026_08_01[1];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-TAX' });

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: true });
    expect(result.ok).toBe(true);
    expect(mockEmitOrderFiscalInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockPrintOrderTicket).toHaveBeenCalledTimes(1);
  });

  it('no emite HkaApp cuando invoicingType es digital_invoicing', async () => {
    const fixture = FALLIDAS_2026_08_01[1];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-DIG' });

    const result = await retryFailedPaymentOrder({
      id,
      declaresTaxes: true,
      effectiveInvoicingType: 'digital_invoicing',
    });
    expect(result.ok).toBe(true);
    expect(mockEmitOrderFiscalInvoice).not.toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockPrintOrderTicket).toHaveBeenCalledTimes(1);
  });

  it('no re-emite HkaApp si la fila ya tiene fiscalInvoiceNumber', async () => {
    const fixture = FALLIDAS_2026_08_01[1];
    const row = failedRowFor(fixture.raw, fixture.amountCents / 100);
    row.order = { ...row.order!, fiscalInvoiceNumber: 77 };
    const id = await recordFailedPayment(row);
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-RETRY' });

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: true });
    expect(result.ok).toBe(true);
    expect(mockEmitOrderFiscalInvoice).not.toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder.mock.calls[0][0].fiscalInvoiceNumber).toBe(77);
  });

  it('si el POST falla queda retry_failed y no se re-dispara sola', async () => {
    const fixture = FALLIDAS_2026_08_01[1];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    await salvageFailedPayments();

    mockCreateOrder.mockRejectedValueOnce(new Error('Kiosk API error (500)'));

    const result = await retryFailedPaymentOrder({ id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('request_failed');
    }
    expect((await getFailedPayment(id))?.status).toBe('retry_failed');
    expect((await getFailedPayment(id))?.salvage?.retryError).toContain('500');
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });

  it('fila tomada por otro proceso (retry_pending) → already_taken sin POST', async () => {
    const fixture = FALLIDAS_2026_08_01[2];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    await salvageFailedPayments();
    await updateFailedPaymentStatus(id, 'retry_pending', {
      expectedStatus: 'salvaged',
    });

    const result = await retryFailedPaymentOrder({ id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('already_taken');
    }
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('producto fuera del catálogo actual → catalog_mismatch sin POST y sin consumir el arm', async () => {
    const fixture = FALLIDAS_2026_08_01[4];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    await salvageFailedPayments();
    mockCatalogEntry.mockImplementation(() => null);

    const result = await retryFailedPaymentOrder({ id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('catalog_mismatch');
    }
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect((await getFailedPayment(id))?.status).toBe('salvaged');
  });

  it('clasifica riesgo de duplicado: error HTTP del backend = bajo, red/timeout = posible duplicado', () => {
    expect(
      classifyRetryDuplicateRisk({
        stage: 'order_register',
        errorMessage: 'Validation failed (400)',
        rawJson: '{"statusCode":400,"message":"Validation failed"}',
      }),
    ).toBe('low');
    expect(
      classifyRetryDuplicateRisk({
        stage: 'order_register',
        errorMessage: 'Network request failed',
        rawJson: null,
      }),
    ).toBe('possible_duplicate');
    expect(
      classifyRetryDuplicateRisk({
        stage: 'pos_parse',
        errorMessage: 'cualquier cosa',
        rawJson: null,
      }),
    ).toBe('low');
  });

  it('fiscal_error row: re-emits HkaApp and POSTs order without a second POS charge', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const row = failedRowFor(fixture.raw, fixture.amountCents / 100);
    row.stage = 'fiscal';
    row.errorReason = 'fiscal_error';
    row.errorMessage = 'Error al emitir factura fiscal';
    const id = await recordFailedPayment(row);
    mockCreateOrder.mockResolvedValueOnce({
      displayOrderNumber: 'ORD-FISCAL',
      shortCode: 'FISC01',
    });

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: true });

    expect(result).toMatchObject({
      ok: true,
      displayOrderNumber: 'ORD-FISCAL',
      shortCode: 'FISC01',
    });
    expect(mockEmitOrderFiscalInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockPrintOrderTicket).toHaveBeenCalledTimes(1);
    expect(await getFailedPayment(id)).toBeNull();
  });

  it('fiscal emit fail stays retry_failed so the operator can tap retry again', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const row = failedRowFor(fixture.raw, fixture.amountCents / 100);
    row.stage = 'fiscal';
    row.errorReason = 'fiscal_error';
    const id = await recordFailedPayment(row);
    mockEmitOrderFiscalInvoice.mockRejectedValueOnce(new Error('HKA offline'));

    const first = await retryFailedPaymentOrder({ id, declaresTaxes: true });
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.reason).toBe('fiscal_failed');
    }
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect((await getFailedPayment(id))?.status).toBe('retry_failed');

    mockEmitOrderFiscalInvoice.mockResolvedValueOnce({ issuedInvoiceNumber: 12 });
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-RETRY2' });
    const second = await retryFailedPaymentOrder({ id, declaresTaxes: true });
    expect(second).toMatchObject({ ok: true, displayOrderNumber: 'ORD-RETRY2' });
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });

  it('if Midaz order already exists, only emits fiscal and does not POST again', async () => {
    const fixture = FALLIDAS_2026_08_01[1];
    const row = failedRowFor(fixture.raw, fixture.amountCents / 100);
    row.stage = 'fiscal';
    row.order = {
      ...row.order!,
      displayOrderNumber: 'ORD-EXISTING',
      shortCode: 'EXIST1',
    };
    const id = await recordFailedPayment(row);

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: true });
    expect(result).toMatchObject({
      ok: true,
      displayOrderNumber: 'ORD-EXISTING',
      shortCode: 'EXIST1',
    });
    expect(mockEmitOrderFiscalInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockPrintOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({ displayOrderNumber: 'ORD-EXISTING' }),
    );
    expect(await getFailedPayment(id)).toBeNull();
  });
});
