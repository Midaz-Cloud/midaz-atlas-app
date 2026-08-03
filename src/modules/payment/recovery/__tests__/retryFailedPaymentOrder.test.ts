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
    mockCatalogEntry.mockReset();
    mockCatalogEntry.mockImplementation(() => ({
      product: { taxRate: 16, isExempt: false },
      apiProductId: 901,
    }));
  });

  it('reintenta una fila salvada: POST sin reservationId y con el posResponse cobrado', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    await salvageFailedPayments();

    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-777' });

    const result = await retryFailedPaymentOrder({ id, declaresTaxes: false });

    expect(result).toEqual({ ok: true, displayOrderNumber: 'ORD-777' });
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    const request = mockCreateOrder.mock.calls[0][0];
    expect(request.reservationId).toBeUndefined();
    expect(request.items).toHaveLength(1);
    expect(request.items[0]).toMatchObject({ productId: 901, quantity: 2 });
    expect(request.posResponse.amount).toBe(String(fixture.amountCents));
    expect(request.posResponse.amount).toMatch(/^\d+$/);

    const record = await getFailedPayment(id);
    expect(record?.status).toBe('retried_ok');
    expect(record?.salvage?.displayOrderNumber).toBe('ORD-777');
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
});
