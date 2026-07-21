import {
  createKioskApiClient,
  KioskApiError,
  mapSellableKioskApiProductsToCatalog,
  mapConfigToRuntime,
  saveAccessToken,
  saveConfigEtag,
  saveProductsEtag,
  clearCachedKioskConfig,
  isLiveConfigCacheStale,
  isMockKioskConfig,
  loadCachedConfigBody,
  mapCachedConfigBody,
  buildCategoriesFromProducts,
  resolveKioskImageUrl,
  type KioskRuntimeConfig,
} from '@shared/api/kiosk';
import {
  getMockApiProducts,
  getMockConfig,
  syncMockCatalogFromMenuMocks,
} from '@shared/api/kiosk/mock/buildMockFixtures';
import { getCatalogCategories, getCatalogProducts, setCatalog } from '@shared/catalog/catalogStore';
import { getKioskApiKey, shouldUseMockApi } from '@shared/config/api';
import { getKioskDeviceProfile } from '@shared/device';

import { syncKioskSessionImages } from '@shared/images/prefetchKioskImages';
import type { ImageSyncProgress } from '@shared/images/kioskImageTypes';

import {
  buildBootstrapSnapshot,
  type KioskBootstrapPhase,
  type KioskBootstrapSnapshot,
} from './kioskBootstrapState';

export type BootstrapKioskSessionOptions = {
  onPhase?: (phase: KioskBootstrapPhase) => void;
  onImageProgress?: (progress: ImageSyncProgress) => void;
};

export type BootstrapKioskSessionResult =
  | {
      status: 'ready';
      accessToken: string;
      runtimeConfig: KioskRuntimeConfig;
      bootstrapSnapshot: KioskBootstrapSnapshot;
      deviceSerial: string;
      imageSyncFailed?: number;
    }
  | {
      status: 'auth_error';
      message: string;
    };

export async function bootstrapKioskSession(
  options?: BootstrapKioskSessionOptions,
): Promise<BootstrapKioskSessionResult> {
  const onPhase = options?.onPhase;
  const onImageProgress = options?.onImageProgress;

  try {
    const device = await getKioskDeviceProfile();
    onPhase?.('login');
    const preLoginClient = createKioskApiClient();
    const login = await preLoginClient.login({
      serialNumber: device.serialNumber,
      apiKey: getKioskApiKey(),
    });
    await saveAccessToken(login.accessToken);

    const client = createKioskApiClient(login.accessToken);

    onPhase?.('config');
    if (!shouldUseMockApi()) {
      const cachedBody = await loadCachedConfigBody();
      const cachedConfig = mapCachedConfigBody(cachedBody);
      if (cachedConfig && isMockKioskConfig(cachedConfig)) {
        await clearCachedKioskConfig();
      } else if (cachedBody && isLiveConfigCacheStale(cachedBody)) {
        await clearCachedKioskConfig();
      }
    }
    // To ensure the kiosk always gets the freshest configuration on startup (bypassing any stale backend ETag issues),
    // we do not send the ETag during the initial bootstrap phase. We only use ETag for background polling/syncing.
    const configResult = await client.getConfig(null);
    const runtimeConfig = mapConfigToRuntime(configResult.config);
    if (configResult.etag) {
      await saveConfigEtag(configResult.etag);
    }

    onPhase?.('products');
    const productsResult = await client.getProducts(null);
    if (productsResult.etag) {
      await saveProductsEtag(productsResult.etag);
    }
    if (shouldUseMockApi()) {
      syncMockCatalogFromMenuMocks();
    } else {
      const sellable = productsResult.products.data.filter((api) => api.isForSale !== false);
      const { menuProducts, idMap } = mapSellableKioskApiProductsToCatalog(sellable);
      const categories = buildCategoriesFromProducts(menuProducts);
      setCatalog(categories, menuProducts, idMap);
    }

    onPhase?.('images');
    let imageSyncFailed = 0;
    try {
      const summary = await syncKioskSessionImages(
        configResult.config,
        getCatalogCategories(),
        getCatalogProducts(),
        {
          resolveUrl: resolveKioskImageUrl,
          onProgress: onImageProgress,
        },
      );
      imageSyncFailed = summary.failed;
    } catch (error) {
      if (__DEV__) {
        console.warn('[bootstrapKioskSession] image sync error', error);
      }
    }

    const productCount = shouldUseMockApi()
      ? getCatalogProducts().length
      : productsResult.products.data.length;
    const bootstrapSnapshot = buildBootstrapSnapshot(
      configResult.config,
      device.serialNumber,
      productCount,
      configResult.etag,
    );

    return {
      status: 'ready',
      accessToken: login.accessToken,
      runtimeConfig,
      bootstrapSnapshot,
      deviceSerial: device.serialNumber,
      imageSyncFailed,
    };
  } catch (err) {
    if (shouldUseMockApi()) {
      syncMockCatalogFromMenuMocks();
      const device = await getKioskDeviceProfile();
      const mockConfig = getMockConfig();
      const runtimeConfig = mapConfigToRuntime(mockConfig);
      onPhase?.('images');
      let imageSyncFailed = 0;
      try {
        const summary = await syncKioskSessionImages(
          mockConfig,
          getCatalogCategories(),
          getCatalogProducts(),
          {
            resolveUrl: resolveKioskImageUrl,
            onProgress: onImageProgress,
          },
        );
        imageSyncFailed = summary.failed;
      } catch {
        // ignore — mock can open without warm cache
      }
      return {
        status: 'ready',
        accessToken: `mock-jwt-${Date.now()}`,
        runtimeConfig,
        bootstrapSnapshot: buildBootstrapSnapshot(
          mockConfig,
          device.serialNumber,
          getMockApiProducts().length,
        ),
        deviceSerial: device.serialNumber,
        imageSyncFailed,
      };
    }
    const message =
      err instanceof KioskApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Error al iniciar el kiosco';
    return { status: 'auth_error', message };
  }
}
