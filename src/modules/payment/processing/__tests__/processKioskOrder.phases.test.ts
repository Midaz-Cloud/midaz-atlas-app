import { shouldEmitFiscalInvoice } from '@shared/peripherals/fiscal';
import { printOrderTicket } from '@shared/peripherals/printer';

import { processKioskOrder } from '../services/processKioskOrder';
import type { OrderProcessingPhase } from '../types';

const mockCreateOrder = jest.fn();

jest.mock('@shared/api/kiosk', () => ({
  createKioskApiClient: () => ({
    createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  }),
  loadAccessToken: jest.fn().mockResolvedValue('token'),
  mapCartToCreateOrderRequest: jest.fn().mockReturnValue({ items: [] }),
  KioskApiError: class KioskApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

jest.mock('@shared/peripherals/fiscal', () => ({
  shouldEmitFiscalInvoice: jest.fn().mockReturnValue(false),
  emitOrderFiscalInvoice: jest.fn(),
}));

jest.mock('@shared/peripherals/printer', () => ({
  printOrderTicket: jest.fn().mockResolvedValue(undefined),
  OrderPrintError: class OrderPrintError extends Error {},
}));

jest.mock('@shared/config', () => ({
  getDemoProcessingPhaseDelayMs: () => 0,
  getDemoProcessingOutcome: () => 'ok',
  isKioskDemoMode: false,
  shouldUseMockApi: () => false,
}));

const baseParams = {
  lines: [],
  totals: {
    subtotalUsd: 1,
    taxUsd: 0,
    totalUsd: 1,
    subtotalPrimary: 1,
    taxPrimary: 0,
    igtfPrimary: 0,
    totalPrimary: 1,
    subtotalVes: 1,
    taxVes: 0,
    igtfVes: 0,
    totalVes: 1,
  },
  usdToVesRate: 1,
  declaresTaxes: false,
  printQrEnabled: true,
};

describe('processKioskOrder phases', () => {
  beforeEach(() => {
    mockCreateOrder.mockReset();
    mockCreateOrder.mockResolvedValue({
      id: 81,
      displayOrderNumber: 'ORD-1',
      shortCode: 'ABC1',
      grandTotalVES: 100,
      grandTotalCurrency: 1,
      currencyCode: 'USD',
    });
    (printOrderTicket as jest.Mock).mockClear();
  });

  it('does not include stock phase', async () => {
    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder(baseParams, (phase) => phases.push(phase));

    expect(phases).toEqual(['registering', 'printing']);
    expect(phases).not.toContain('stock');
  });

  it('includes fiscal phase when org declares taxes', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValueOnce(true);
    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder({ ...baseParams, declaresTaxes: true }, (phase) =>
      phases.push(phase),
    );

    expect(phases[0]).toBe('fiscal');
    expect(phases).not.toContain('stock');
  });

  it('prints tracking QR when shortCode is present and payment is not cash', async () => {
    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos' },
      () => undefined,
    );

    expect(printOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        printQrEnabled: true,
        trackShortCode: 'ABC1',
      }),
    );
  });

  it('omits QR when payment method is cash even if shortCode arrived', async () => {
    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'cash' },
      () => undefined,
    );

    expect(printOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        printQrEnabled: false,
        trackShortCode: null,
      }),
    );
  });

  it('omits QR when shortCode is null and does not fall back to order id', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 81,
      displayOrderNumber: 'ORD-1',
      shortCode: null,
      grandTotalVES: 100,
      grandTotalCurrency: 1,
      currencyCode: 'USD',
    });

    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos' },
      () => undefined,
    );

    expect(printOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        printQrEnabled: false,
        trackShortCode: null,
      }),
    );
    expect(printOrderTicket).not.toHaveBeenCalledWith(
      expect.objectContaining({ trackShortCode: '81' }),
    );
  });
});
