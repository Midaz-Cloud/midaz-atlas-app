import { FALLIDAS_2026_08_01 } from '@shared/peripherals/ecr/__fixtures__/fallidas.2026-08-01';
import {
  recordFailedPayment,
  type FailedPaymentInput,
} from '@shared/persistence';

import { retryCustomerFiscalEmit } from '../services/retryCustomerFiscalEmit';

const mockCreateOrder = jest.fn();
const mockPrintOrderTicket = jest.fn();
const mockEmitOrderFiscalInvoice = jest.fn();
const mockProcessKioskOrder = jest.fn();

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

jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogEntryByLineProductId: () => ({
    product: { taxRate: 16, isExempt: false },
    apiProductId: 901,
  }),
}));

jest.mock('@modules/payment/processing/services/processKioskOrder', () => ({
  processKioskOrder: (...args: unknown[]) => mockProcessKioskOrder(...args),
}));

function failedRowFor(raw: string, totalVes: number): FailedPaymentInput {
  return {
    stage: 'fiscal',
    paymentMethod: 'pos',
    errorReason: 'fiscal_error',
    errorMessage: 'Error al emitir factura fiscal',
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

const sessionParams = {
  lines: [],
  totals: {
    subtotalUsd: 1,
    taxUsd: 0,
    totalUsd: 1,
    totalVes: 1,
  },
  usdToVesRate: 1,
};

describe('retryCustomerFiscalEmit', () => {
  beforeEach(() => {
    mockCreateOrder.mockReset();
    mockPrintOrderTicket.mockReset();
    mockEmitOrderFiscalInvoice.mockReset();
    mockProcessKioskOrder.mockReset();
    mockPrintOrderTicket.mockResolvedValue(undefined);
    mockEmitOrderFiscalInvoice.mockResolvedValue({ issuedInvoiceNumber: 1 });
  });

  it('uses failed_payments salvage when the fiscal row is retryable', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    mockCreateOrder.mockResolvedValueOnce({
      displayOrderNumber: 'ORD-SALVAGE',
      shortCode: 'SALV01',
    });

    const result = await retryCustomerFiscalEmit({
      failedPaymentId: id,
      salvage: { declaresTaxes: true },
      session: sessionParams,
    });

    expect(result).toMatchObject({
      status: 'ok',
      orderId: 'ORD-SALVAGE',
    });
    expect(mockProcessKioskOrder).not.toHaveBeenCalled();
    expect(mockEmitOrderFiscalInvoice).toHaveBeenCalledTimes(1);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });

  it('falls back to processKioskOrder with skipSimulatedFiscalError when there is no salvage row', async () => {
    mockProcessKioskOrder.mockResolvedValueOnce({
      status: 'ok',
      orderId: 'ORD-SESSION',
    });

    const result = await retryCustomerFiscalEmit({
      failedPaymentId: null,
      salvage: { declaresTaxes: true },
      session: sessionParams,
    });

    expect(result).toEqual({ status: 'ok', orderId: 'ORD-SESSION' });
    expect(mockProcessKioskOrder).toHaveBeenCalledWith(
      expect.objectContaining({ skipSimulatedFiscalError: true }),
      expect.any(Function),
    );
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('maps salvage print warning to ticket_print_failed, not fiscal_error', async () => {
    const fixture = FALLIDAS_2026_08_01[0];
    const id = await recordFailedPayment(
      failedRowFor(fixture.raw, fixture.amountCents / 100),
    );
    mockCreateOrder.mockResolvedValueOnce({ displayOrderNumber: 'ORD-PRINT' });
    mockPrintOrderTicket.mockRejectedValueOnce(new Error('USB offline'));

    const result = await retryCustomerFiscalEmit({
      failedPaymentId: id,
      salvage: { declaresTaxes: false },
      session: sessionParams,
    });

    expect(result.status).toBe('ticket_print_failed');
    if (result.status === 'ticket_print_failed') {
      expect(result.orderId).toBe('ORD-PRINT');
    }
  });
});
