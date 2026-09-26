const mockGetCatalogProducts = jest.fn();
const mockGetKioskConnectivity = jest.fn();
const mockListFailedPaymentRecordsByStatus = jest.fn();
const mockGetOrderSyncSnapshot = jest.fn();
const mockCheckFiscalHealth = jest.fn();

jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogProducts: (...args: unknown[]) => mockGetCatalogProducts(...args),
}));

jest.mock('@shared/connectivity', () => ({
  getKioskConnectivity: (...args: unknown[]) => mockGetKioskConnectivity(...args),
}));

jest.mock('@shared/persistence', () => ({
  listFailedPaymentRecordsByStatus: (...args: unknown[]) =>
    mockListFailedPaymentRecordsByStatus(...args),
}));

jest.mock('@shared/sync', () => ({
  getOrderSyncSnapshot: (...args: unknown[]) => mockGetOrderSyncSnapshot(...args),
}));

jest.mock('@shared/peripherals/fiscal/checkFiscalHealth', () => ({
  checkFiscalHealth: (...args: unknown[]) => mockCheckFiscalHealth(...args),
}));

import { collectKioskTelemetry } from '../kioskTelemetry';

describe('collectKioskTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCatalogProducts.mockReturnValue([{ id: 'p1' }, { id: 'p2' }]);
    mockGetKioskConnectivity.mockReturnValue({ status: 'online' });
    mockListFailedPaymentRecordsByStatus.mockResolvedValue([{ id: 1 }]);
    mockGetOrderSyncSnapshot.mockReturnValue({ pending: 3, failed: 1 });
    mockCheckFiscalHealth.mockResolvedValue({ success: true, data: { healthy: true } });
  });

  it('reports every source when everything works', async () => {
    const result = await collectKioskTelemetry({
      requiresFiscalPrinter: true,
      sessionMode: 'online',
      lanRunning: true,
    });

    expect(result.device.memTotalMb).toBeGreaterThan(0);
    expect(result.network).toEqual({ status: 'online' });
    expect(result.fiscal).toEqual({ healthy: true });
    expect(result.lan).toEqual({ running: true });
    expect(result.sync).toEqual({ pending: 3, failed: 1, openFailedPayments: 1 });
    expect(result.catalog).toEqual({ products: 2 });
    expect(result.sessionMode).toBe('online');
  });

  it('keeps reporting the rest when one source fails (fiscal unreachable)', async () => {
    mockCheckFiscalHealth.mockRejectedValue(new Error('HkaApp no responde'));

    const result = await collectKioskTelemetry({
      requiresFiscalPrinter: true,
      sessionMode: 'online',
      lanRunning: false,
    });

    expect(result.fiscal).toEqual({ healthy: false });
    // El resto del reporte no se vacía por la falla fiscal.
    expect(result.catalog).toEqual({ products: 2 });
    expect(result.sync.pending).toBe(3);
    expect(result.device.memTotalMb).toBeGreaterThan(0);
  });

  it('keeps reporting the rest when the failed-payments query throws', async () => {
    mockListFailedPaymentRecordsByStatus.mockRejectedValue(new Error('sqlite locked'));

    const result = await collectKioskTelemetry({
      requiresFiscalPrinter: false,
      sessionMode: 'offline',
      lanRunning: true,
    });

    expect(result.sync.openFailedPayments).toBe(0);
    expect(result.fiscal).toBeNull();
    expect(result.catalog).toEqual({ products: 2 });
  });

  it('does not query fiscal health when the org has no physical fiscal printer', async () => {
    const result = await collectKioskTelemetry({
      requiresFiscalPrinter: false,
      sessionMode: 'online',
      lanRunning: true,
    });

    expect(mockCheckFiscalHealth).not.toHaveBeenCalled();
    expect(result.fiscal).toBeNull();
  });
});
