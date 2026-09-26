import { mapCartToCreateOrderRequest } from '@shared/api/kiosk';
import { emitOrderFiscalInvoice, shouldEmitFiscalInvoice } from '@shared/peripherals/fiscal';
import { printOrderTicket, OrderPrintError } from '@shared/peripherals/printer';

import { KioskApiError, KioskNetworkError } from '@shared/api/kiosk';
import { isKioskOffline } from '@shared/connectivity';
import { __resetKioskConnectivityForTests } from '@shared/connectivity/kioskConnectivityStore';
import { getLocalComandaByClientOrderId, getOrderOutboxByClientOrderId } from '@shared/persistence';

import { OFFLINE_TICKET_FOOTER_NOTE, processKioskOrder } from '../services/processKioskOrder';
import type { OrderProcessingPhase } from '../types';

const mockCreateOrder = jest.fn();

jest.mock('@shared/api/kiosk', () => ({
  createKioskApiClient: () => ({
    createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  }),
  loadAccessToken: jest.fn().mockResolvedValue('token'),
  withKioskAuth: (run: (client: unknown) => unknown) =>
    run({ createOrder: (...args: unknown[]) => mockCreateOrder(...args) }),
  mapCartToCreateOrderRequest: jest.fn().mockReturnValue({ items: [] }),
  KioskApiError: jest.requireActual('@shared/api/kiosk/errors').KioskApiError,
  KioskNetworkError: jest.requireActual('@shared/api/kiosk/errors').KioskNetworkError,
  isKioskNetworkError: jest.requireActual('@shared/api/kiosk/errors').isKioskNetworkError,
}));

jest.mock('@shared/peripherals/fiscal', () => ({
  shouldEmitFiscalInvoice: jest.fn().mockReturnValue(false),
  emitOrderFiscalInvoice: jest.fn(),
}));

jest.mock('@shared/peripherals/printer', () => ({
  printOrderTicket: jest.fn().mockResolvedValue(undefined),
  OrderPrintError: class OrderPrintError extends Error {
    code?: string;
    constructor(message: string, options?: { code?: string }) {
      super(message);
      this.name = 'OrderPrintError';
      this.code = options?.code;
    }
  },
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
    (shouldEmitFiscalInvoice as jest.Mock).mockReset();
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(false);
    (emitOrderFiscalInvoice as jest.Mock).mockReset();
    (mapCartToCreateOrderRequest as jest.Mock).mockClear();
    (mapCartToCreateOrderRequest as jest.Mock).mockReturnValue({ items: [] });
  });

  it('does not include stock phase', async () => {
    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder(baseParams, (phase) => phases.push(phase));

    expect(phases).toEqual(['registering', 'printing']);
    expect(phases).not.toContain('stock');
  });

  it('POSTs the order after payment even when fiscal emit is skipped', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(false);

    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos', declaresTaxes: false },
      () => undefined,
    );

    expect(mockCreateOrder).toHaveBeenCalled();
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

  it('skips fiscal phase for cash even when org declares taxes', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockImplementation(
      (declaresTaxes, paymentMethod) =>
        Boolean(declaresTaxes) && paymentMethod !== 'cash',
    );
    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'cash', declaresTaxes: true },
      (phase) => phases.push(phase),
    );

    expect(phases).toEqual(['registering', 'printing']);
    expect(emitOrderFiscalInvoice).not.toHaveBeenCalled();
  });

  it('skips fiscal phase for digital_invoicing + POS even when declaresTaxes', async () => {
    const { shouldEmitFiscalInvoice: realShouldEmit } = jest.requireActual(
      '@shared/peripherals/fiscal',
    ) as { shouldEmitFiscalInvoice: typeof shouldEmitFiscalInvoice };
    (shouldEmitFiscalInvoice as jest.Mock).mockImplementation(realShouldEmit);

    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder(
      {
        ...baseParams,
        paymentMethodId: 'pos',
        declaresTaxes: true,
        effectiveInvoicingType: 'digital_invoicing',
      },
      (phase) => phases.push(phase),
    );

    expect(phases).toEqual(['registering', 'printing']);
    expect(emitOrderFiscalInvoice).not.toHaveBeenCalled();
    expect(mockCreateOrder).toHaveBeenCalled();
    expect(printOrderTicket).toHaveBeenCalled();
  });

  it('includes fiscal phase for fiscal_machine + POS + declaresTaxes', async () => {
    const { shouldEmitFiscalInvoice: realShouldEmit } = jest.requireActual(
      '@shared/peripherals/fiscal',
    ) as { shouldEmitFiscalInvoice: typeof shouldEmitFiscalInvoice };
    (shouldEmitFiscalInvoice as jest.Mock).mockImplementation(realShouldEmit);
    (emitOrderFiscalInvoice as jest.Mock).mockResolvedValue({
      issuedInvoiceNumber: 10,
    });

    const phases: OrderProcessingPhase[] = [];
    await processKioskOrder(
      {
        ...baseParams,
        paymentMethodId: 'pos',
        declaresTaxes: true,
        effectiveInvoicingType: 'fiscal_machine',
      },
      (phase) => phases.push(phase),
    );

    expect(phases).toEqual(['fiscal', 'registering', 'printing']);
    expect(emitOrderFiscalInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodId: 'pos',
        declaresTaxes: true,
        effectiveInvoicingType: 'fiscal_machine',
      }),
    );
  });

  it('passes issuedInvoiceNumber as fiscalInvoiceNumber on the order POST', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(true);
    (emitOrderFiscalInvoice as jest.Mock).mockResolvedValue({
      issuedInvoiceNumber: 42,
    });

    await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos', declaresTaxes: true },
      () => undefined,
    );

    expect(mapCartToCreateOrderRequest).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalInvoiceNumber: 42 }),
    );
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

  it('maps ticket print failure after a registered order to ticket_print_failed, not fiscal_error', async () => {
    (printOrderTicket as jest.Mock).mockRejectedValueOnce(
      new OrderPrintError('No se encontraron impresoras USB', { code: 'NO_USB_DEVICE' }),
    );

    const result = await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos' },
      () => undefined,
    );

    expect(result).toEqual({
      status: 'ticket_print_failed',
      orderId: 'ORD-1',
      shortCode: 'ABC1',
      fiscalInvoiceNumber: undefined,
      message: 'No se encontraron impresoras USB',
    });
    expect(mockCreateOrder).toHaveBeenCalled();
  });

  it('keeps fiscal_error when HkaApp emit fails and does not create the order', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(true);
    (emitOrderFiscalInvoice as jest.Mock).mockRejectedValueOnce(
      new Error('HKA connection refused'),
    );

    const result = await processKioskOrder(
      { ...baseParams, paymentMethodId: 'pos', declaresTaxes: true },
      () => undefined,
    );

    expect(result.status).toBe('fiscal_error');
    expect(result).toMatchObject({
      status: 'fiscal_error',
      message: 'HKA connection refused',
    });
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(printOrderTicket).not.toHaveBeenCalled();
  });

  describe('registro sin backend (la venta ya se cobró)', () => {
    let seq = 0;
    const nextClientOrderId = () => {
      seq += 1;
      return `0b1c2d3e-4f50-4a61-8b72-${String(seq).padStart(12, '0')}`;
    };

    beforeEach(() => {
      __resetKioskConnectivityForTests();
    });

    it('POST falla por red después de la factura → queda en el kiosko con número local y se entrega', async () => {
      (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(true);
      (emitOrderFiscalInvoice as jest.Mock).mockResolvedValue({ issuedInvoiceNumber: 2616 });
      mockCreateOrder.mockRejectedValueOnce(new KioskNetworkError('timeout', '/kiosk/orders'));
      const clientOrderId = nextClientOrderId();
      const registered = jest.fn();

      const result = await processKioskOrder(
        {
          ...baseParams,
          paymentMethodId: 'pos',
          declaresTaxes: true,
          clientOrderId,
          deviceSerial: 'MDZ-KIOSK-001',
          paidAt: '2026-09-24T16:01:36.000Z',
          reservationId: 'res-1',
          cardPayment: { posReference: 'POS-99' } as never,
          onOrderRegistered: registered,
        },
        () => undefined,
      );

      expect(result).toMatchObject({ status: 'ok', registeredLocally: true, fiscalInvoiceNumber: 2616 });
      const orderId = (result as { orderId: string }).orderId;
      expect(orderId).toMatch(/^K001-\d{4}$/);
      expect(registered).toHaveBeenCalledWith(orderId, 1, 1, 'USD');
      expect(printOrderTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          displayOrderNumber: orderId,
          printQrEnabled: false,
          trackShortCode: null,
          footerNote: OFFLINE_TICKET_FOOTER_NOTE,
        }),
      );
      expect(isKioskOffline()).toBe(true);

      const outbox = await getOrderOutboxByClientOrderId(clientOrderId);
      expect(outbox).toMatchObject({
        status: 'queued',
        origin: 'register_failed',
        localNumber: orderId,
        fiscalInvoiceNumber: 2616,
        posReference: 'POS-99',
        paidAt: '2026-09-24T16:01:36.000Z',
      });
      const request = (outbox!.payload as { request: Record<string, unknown> }).request;
      expect(request).toMatchObject({
        clientOrderId,
        offline: true,
        paidAt: '2026-09-24T16:01:36.000Z',
        localOrderNumber: orderId,
        grandTotalVES: 1,
      });
      expect(request).not.toHaveProperty('reservationId');
      expect(await getLocalComandaByClientOrderId(clientOrderId)).toMatchObject({
        localNumber: orderId,
        paymentStatus: 'paid',
        status: 'pending',
      });
    });

    it('sesión offline: no intenta el POST y registra directo en el kiosko', async () => {
      const clientOrderId = nextClientOrderId();

      const result = await processKioskOrder(
        { ...baseParams, paymentMethodId: 'pos', clientOrderId, deviceSerial: 'MDZ-KIOSK-001', offlineMode: true },
        () => undefined,
      );

      expect(mockCreateOrder).not.toHaveBeenCalled();
      expect(result).toMatchObject({ status: 'ok', registeredLocally: true });
      expect(await getOrderOutboxByClientOrderId(clientOrderId)).toMatchObject({ origin: 'offline' });
    });

    it('rechazo 4xx: la venta se entrega igual y queda `failed` para revisión', async () => {
      mockCreateOrder.mockRejectedValueOnce(new KioskApiError('Producto inválido', 422));
      const clientOrderId = nextClientOrderId();

      const result = await processKioskOrder(
        { ...baseParams, paymentMethodId: 'pos', clientOrderId, deviceSerial: 'MDZ-KIOSK-001' },
        () => undefined,
      );

      expect(result).toMatchObject({ status: 'ok', registeredLocally: true });
      expect(isKioskOffline()).toBe(false);
      expect(await getOrderOutboxByClientOrderId(clientOrderId)).toMatchObject({
        status: 'failed',
        lastError: 'Producto inválido',
        lastErrorStatus: 422,
      });
    });

    it('reserva vencida: reintenta una vez sin reservationId con el mismo clientOrderId', async () => {
      (mapCartToCreateOrderRequest as jest.Mock).mockReturnValue({ items: [], reservationId: 'res-old' });
      mockCreateOrder.mockRejectedValueOnce(new KioskApiError('Reservation expired', 400));
      const clientOrderId = nextClientOrderId();
      const onExpired = jest.fn();

      const result = await processKioskOrder(
        {
          ...baseParams,
          paymentMethodId: 'pos',
          clientOrderId,
          deviceSerial: 'MDZ-KIOSK-001',
          onReservationExpired: onExpired,
        },
        () => undefined,
      );

      expect(result).toMatchObject({ status: 'ok', orderId: 'ORD-1' });
      expect(onExpired).toHaveBeenCalled();
      expect(mockCreateOrder).toHaveBeenCalledTimes(2);
      const [retryRequest, retryOptions] = mockCreateOrder.mock.calls[1];
      expect(retryRequest).not.toHaveProperty('reservationId');
      expect(retryRequest.clientOrderId).toBe(clientOrderId);
      expect(retryOptions).toEqual({ idempotencyKey: clientOrderId });
    });

    it('sin clientOrderId/serial no hay dónde guardarla → failed (último recurso)', async () => {
      mockCreateOrder.mockRejectedValueOnce(new Error('Gateway timeout'));

      const result = await processKioskOrder({ ...baseParams, paymentMethodId: 'pos' }, () => undefined);

      expect(result).toMatchObject({ status: 'failed', message: 'Gateway timeout' });
      expect(printOrderTicket).not.toHaveBeenCalled();
    });
  });

  it('skips POST /kiosk/orders when the Midaz order already exists', async () => {
    (shouldEmitFiscalInvoice as jest.Mock).mockReturnValue(true);
    (emitOrderFiscalInvoice as jest.Mock).mockResolvedValue({
      issuedInvoiceNumber: 88,
    });

    const result = await processKioskOrder(
      {
        ...baseParams,
        paymentMethodId: 'pos',
        declaresTaxes: true,
        existingRegisteredOrder: {
          displayOrderNumber: 'ORD-EXISTING',
          shortCode: 'EXST01',
        },
      },
      () => undefined,
    );

    expect(result).toMatchObject({
      status: 'ok',
      orderId: 'ORD-EXISTING',
      fiscalInvoiceNumber: 88,
    });
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(printOrderTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOrderNumber: 'ORD-EXISTING',
        trackShortCode: 'EXST01',
      }),
    );
  });
});
