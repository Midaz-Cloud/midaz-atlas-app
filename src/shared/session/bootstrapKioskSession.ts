import {
  createKioskApiClient,
  KioskApiError,
  isKioskNetworkError,
  loadAccessTokenRaw,
  loadCachedProductsBody,
  parseKioskProductsResponse,
  mapConfigToRuntime,
  saveAccessToken,
  saveConfigEtag,
  saveProductsEtag,
  clearCachedKioskConfig,
  isLiveConfigCacheStale,
  isMockKioskConfig,
  loadCachedConfigBody,
  mapCachedConfigBody,
  resolveKioskImageUrl,
  type KioskRuntimeConfig,
} from '@shared/api/kiosk';
import {
  getMockApiProducts,
  getMockConfig,
  syncMockCatalogFromMenuMocks,
} from '@shared/api/kiosk/mock/buildMockFixtures';
import { getCatalogCategories, getCatalogProducts } from '@shared/catalog/catalogStore';
import { getKioskApiKey, shouldUseMockApi } from '@shared/config/api';
import { markKioskOffline } from '@shared/connectivity';
import { getKioskDeviceProfile } from '@shared/device';

import { syncKioskSessionImages } from '@shared/images/prefetchKioskImages';
import type { ImageSyncProgress } from '@shared/images/kioskImageTypes';

import { applyProductsToCatalog } from './applyProductsToCatalog';
import {
  buildBootstrapSnapshot,
  type KioskBootstrapPhase,
  type KioskBootstrapSnapshot,
} from './kioskBootstrapState';

export type BootstrapKioskSessionOptions = {
  onPhase?: (phase: KioskBootstrapPhase) => void;
  onImageProgress?: (progress: ImageSyncProgress) => void;
};

/** `offline`: arrancó sin backend con la config y el catálogo de la última sesión. */
export type KioskSessionMode = 'online' | 'offline';

export type BootstrapKioskSessionResult =
  | {
      status: 'ready';
      mode: KioskSessionMode;
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
      applyProductsToCatalog(productsResult.products);
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
      mode: 'online',
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
        mode: 'online',
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
    if (isBackendUnreachable(err)) {
      const offline = await bootstrapFromCache(onPhase);
      if (offline) {
        markKioskOffline('bootstrap: backend unreachable, using cache');
        return offline;
      }
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

/** Red caída o gateway/servicio sin responder: se puede vender con lo cacheado. 401/403 no. */
function isBackendUnreachable(err: unknown): boolean {
  if (isKioskNetworkError(err)) {
    return true;
  }
  return err instanceof KioskApiError && err.statusCode >= 500;
}

/**
 * Arranque sin backend: config y catálogo de la última sesión en línea. Sin caché
 * (kiosko recién instalado) no hay nada que vender y se muestra el error normal.
 */
async function bootstrapFromCache(
  onPhase?: (phase: KioskBootstrapPhase) => void,
): Promise<BootstrapKioskSessionResult | null> {
  try {
    const [cachedConfigBody, cachedProductsBody, device] = await Promise.all([
      loadCachedConfigBody(),
      loadCachedProductsBody(),
      getKioskDeviceProfile(),
    ]);
    const config = mapCachedConfigBody(cachedConfigBody);
    if (!config || isMockKioskConfig(config) || !cachedProductsBody) {
      return null;
    }
    onPhase?.('products');
    const primaryCurrency = config.organization?.primaryCurrency ?? 'USD';
    const products = parseKioskProductsResponse(cachedProductsBody, primaryCurrency);
    applyProductsToCatalog(products);
    return {
      status: 'ready',
      mode: 'offline',
      accessToken: (await loadAccessTokenRaw())?.token ?? '',
      runtimeConfig: mapConfigToRuntime(config),
      bootstrapSnapshot: buildBootstrapSnapshot(config, device.serialNumber, products.data.length),
      deviceSerial: device.serialNumber,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[bootstrapKioskSession] offline bootstrap from cache failed', error);
    }
    return null;
  }
}
