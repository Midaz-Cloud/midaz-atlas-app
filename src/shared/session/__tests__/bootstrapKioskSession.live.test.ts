import liveConfigFixture from '@shared/api/kiosk/fixtures/live/config.response.json';

const mockLogin = jest.fn();
const mockGetConfig = jest.fn();
const mockGetProducts = jest.fn();
const mockSyncImages = jest.fn();

jest.mock('@shared/api/kiosk', () => {
  const actual = jest.requireActual('@shared/api/kiosk');
  return {
    ...actual,
    createKioskApiClient: jest.fn(() => ({
      login: mockLogin,
      getConfig: mockGetConfig,
      getProducts: mockGetProducts,
    })),
    saveAccessToken: jest.fn(),
    saveConfigEtag: jest.fn(),
    saveProductsEtag: jest.fn(),
    loadConfigEtag: jest.fn(() => Promise.resolve(null)),
    saveCachedConfigBody: jest.fn(),
  };
});

jest.mock('@shared/config/api', () => ({
  getKioskApiKey: () => 'test-key',
  shouldUseMockApi: () => false,
  getKioskUploadsBaseUrl: () => 'http://10.182.5.14:3000',
}));

jest.mock('@shared/device', () => ({
  getKioskDeviceProfile: () =>
    Promise.resolve({
      serialNumber: 'AF910S202550915004',
      uniqueId: 'uid',
      brand: 'Test',
      model: 'Kiosk',
      systemVersion: '11',
      appVersion: '0.0.1',
      buildNumber: '1',
    }),
}));

jest.mock('@shared/images/prefetchKioskImages', () => ({
  syncKioskSessionImages: (...args: unknown[]) => mockSyncImages(...args),
}));

import { bootstrapKioskSession } from '../bootstrapKioskSession';
import { mapLiveConfigToKioskConfigResponse } from '@shared/api/kiosk/mappers/liveConfig';
import type { KioskConfigResponseLive } from '@shared/api/kiosk/liveApi.types';

describe('bootstrapKioskSession (live fixtures)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ accessToken: 'jwt-live' });
    mockGetConfig.mockResolvedValue({
      config: mapLiveConfigToKioskConfigResponse(
        liveConfigFixture as KioskConfigResponseLive,
      ),
      etag: '"live-etag"',
    });
    mockGetProducts.mockResolvedValue({
      products: { data: [] },
      etag: '"products-etag"',
      notModified: false,
    });
    mockSyncImages.mockResolvedValue({
      total: 2,
      skipped: 1,
      downloaded: 1,
      failed: 0,
      failedUrls: [],
    });
  });

  it('awaits image sync and reports progress during images phase', async () => {
    const phases: string[] = [];
    const progressEvents: number[] = [];
    const result = await bootstrapKioskSession({
      onPhase: (p) => phases.push(p),
      onImageProgress: (p) => progressEvents.push(p.done),
    });

    if (result.status === 'auth_error') {
      throw new Error(result.message);
    }
    expect(result.status).toBe('ready');
    expect(result.accessToken).toBe('jwt-live');
    expect(phases).toEqual(['login', 'config', 'products', 'images']);
    expect(mockSyncImages).toHaveBeenCalled();
    const call = mockSyncImages.mock.calls[0];
    const opts = call?.[3] as { onProgress?: (p: any) => void };
    opts?.onProgress?.({ done: 1, total: 2, skipped: 0, downloaded: 1, failed: 0, remaining: 1 });
    expect(progressEvents).toContain(1);
  });
});
