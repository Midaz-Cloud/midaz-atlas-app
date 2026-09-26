import liveConfigFixture from '@shared/api/kiosk/fixtures/live/config.response.json';
import { mapLiveConfigToKioskConfigResponse } from '@shared/api/kiosk/mappers/liveConfig';
import type { KioskConfigResponseLive } from '@shared/api/kiosk/liveApi.types';

const mockGetConfig = jest.fn();
const mockGetProducts = jest.fn();
const mockLoadConfigEtag = jest.fn();
const mockSaveConfigEtag = jest.fn();

jest.mock('@shared/api/kiosk', () => {
  const actual = jest.requireActual('@shared/api/kiosk');
  return {
    ...actual,
    createKioskApiClient: jest.fn(() => ({
      getConfig: mockGetConfig,
      getProducts: mockGetProducts,
    })),
    withKioskAuth: jest.fn(async (fn: (client: unknown) => unknown) =>
      fn({ getConfig: mockGetConfig, getProducts: mockGetProducts }),
    ),
    loadConfigEtag: (...args: unknown[]) => mockLoadConfigEtag(...args),
    saveConfigEtag: (...args: unknown[]) => mockSaveConfigEtag(...args),
    loadProductsEtag: jest.fn(() => Promise.resolve('"products-etag"')),
    saveProductsEtag: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('@shared/config/api', () => ({
  shouldUseMockApi: () => false,
  getKioskUploadsBaseUrl: () => 'http://10.182.5.14:3000',
}));

jest.mock('@shared/catalog/catalogStore', () => ({
  setCatalog: jest.fn(),
  getCatalogProducts: jest.fn(() => []),
  getScanIndexDebugInfo: jest.fn(() => ({
    productCount: 0,
    barcodeIndexSize: 0,
    skuIndexSize: 0,
    barcodeKeys: [],
    skuKeysSample: [],
  })),
}));

jest.mock('@modules/ordering/retail/logRetailScan', () => ({
  logRetailScan: jest.fn(),
}));

jest.mock('@shared/images/prefetchKioskImages', () => ({
  prefetchCatalogImages: jest.fn(() => Promise.resolve()),
  prefetchKioskConfigImages: jest.fn(() => Promise.resolve()),
}));

import { startKioskCatalogSync } from '../kioskCatalogSync';

const liveConfig = mapLiveConfigToKioskConfigResponse(
  liveConfigFixture as KioskConfigResponseLive,
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('startKioskCatalogSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLoadConfigEtag.mockResolvedValue('"config-etag-1"');
    mockGetProducts.mockResolvedValue({
      products: { data: [] },
      etag: '"products-etag"',
      notModified: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not write the config ETag when the server returns the same one (304)', async () => {
    mockGetConfig.mockResolvedValue({
      config: liveConfig,
      etag: '"config-etag-1"',
      notModified: false,
    });

    const onConfigUpdated = jest.fn();
    const controller = startKioskCatalogSync({
      deviceSerial: 'AF910-TEST-001',
      onConfigUpdated,
    });

    // Primer tick del intervalo de config (60s).
    await jest.advanceTimersByTimeAsync(60_000);

    expect(mockGetConfig).toHaveBeenCalledTimes(1);
    // El ETag devuelto es igual al que ya teníamos guardado: no hay por qué reescribirlo.
    expect(mockSaveConfigEtag).not.toHaveBeenCalled();
    expect(onConfigUpdated).toHaveBeenCalledTimes(1);

    controller.stop();
  });

  it('writes the config ETag only when it actually changed', async () => {
    mockGetConfig.mockResolvedValue({
      config: liveConfig,
      etag: '"config-etag-2"',
      notModified: false,
    });

    const controller = startKioskCatalogSync({
      deviceSerial: 'AF910-TEST-001',
      onConfigUpdated: jest.fn(),
    });

    await jest.advanceTimersByTimeAsync(60_000);

    expect(mockSaveConfigEtag).toHaveBeenCalledWith('"config-etag-2"');

    controller.stop();
  });

  it('stop() discards an in-flight config response instead of applying it late', async () => {
    const gate = deferred<{
      config: typeof liveConfig;
      etag: string;
      notModified: boolean;
    }>();
    mockGetConfig.mockReturnValue(gate.promise);

    const onConfigUpdated = jest.fn();
    const controller = startKioskCatalogSync({
      deviceSerial: 'AF910-TEST-001',
      onConfigUpdated,
    });

    // Dispara el primer tick; `getConfig` queda pendiente (gate sin resolver).
    const tickPromise = jest.advanceTimersByTimeAsync(60_000);

    // El kiosko se apaga / navega fuera de la sesión ANTES de que llegue la respuesta.
    controller.stop();

    gate.resolve({ config: liveConfig, etag: '"config-etag-late"', notModified: false });
    await tickPromise;

    expect(onConfigUpdated).not.toHaveBeenCalled();
    expect(mockSaveConfigEtag).not.toHaveBeenCalled();
  });
});
