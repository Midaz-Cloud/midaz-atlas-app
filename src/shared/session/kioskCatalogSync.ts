import {
  buildCategoriesFromProducts,
  createKioskApiClient,
  mapConfigToRuntime,
  mapSellableKioskApiProductsToCatalog,
  loadAccessToken,
  loadConfigEtag,
  saveConfigEtag,
  loadProductsEtag,
  saveProductsEtag,
  resolveKioskImageUrl,
  type KioskConfigResponse,
  type KioskRuntimeConfig,
} from '@shared/api/kiosk';
import { syncMockCatalogFromMenuMocks } from '@shared/api/kiosk/mock/buildMockFixtures';
import { setCatalog, getCatalogProducts, getScanIndexDebugInfo } from '@shared/catalog/catalogStore';
import { logRetailScan } from '@modules/ordering/retail/logRetailScan';
import { prefetchCatalogImages, prefetchKioskConfigImages } from '@shared/images/prefetchKioskImages';
import { shouldUseMockApi } from '@shared/config/api';

import { buildBootstrapSnapshot, type KioskBootstrapSnapshot } from './kioskBootstrapState';

const CONFIG_POLL_MS = 60_000;
const PRODUCTS_REFRESH_MS = 60_000;

export type KioskCatalogSyncCallbacks = {
  deviceSerial: string;
  onConfigUpdated: (payload: {
    runtimeConfig: KioskRuntimeConfig;
    bootstrapSnapshot: KioskBootstrapSnapshot;
  }) => void;
};

export type KioskCatalogSyncController = {
  stop: () => void;
  /** Fuerza GET /kiosk/products (sin ETag) y reinicia el intervalo de 60s. */
  refreshProductsNow: () => Promise<void>;
};

async function applyProductsResponse(
  productsResponse: Awaited<ReturnType<ReturnType<typeof createKioskApiClient>['getProducts']>>,
): Promise<number> {
  const sellable = productsResponse.products.data.filter((api) => api.isForSale !== false);
  const { menuProducts, idMap } = mapSellableKioskApiProductsToCatalog(sellable);
  const categories = buildCategoriesFromProducts(menuProducts);
  setCatalog(categories, menuProducts, idMap);
  logRetailScan('catalog synced from API', {
    sellableCount: menuProducts.length,
    ...getScanIndexDebugInfo(),
  });
  // Background strict sync — skips files already on disk; does not block UI.
  void prefetchCatalogImages(categories, menuProducts).catch(() => undefined);
  if (productsResponse.etag && !productsResponse.notModified) {
    await saveProductsEtag(productsResponse.etag);
  }
  return menuProducts.length;
}

async function fetchAndApplyProducts(
  force = false,
): Promise<number> {
  const token = await loadAccessToken();
  const client = createKioskApiClient(token ?? undefined);
  const etag = force ? null : await loadProductsEtag();
  const productsResponse = await client.getProducts(etag);
  if (productsResponse.notModified && !force) {
    return getCatalogProducts().length;
  }
  return applyProductsResponse(productsResponse);
}

export function startKioskCatalogSync(
  callbacks: KioskCatalogSyncCallbacks,
): KioskCatalogSyncController {
  if (shouldUseMockApi()) {
    return {
      stop: () => {},
      refreshProductsNow: async () => {
        syncMockCatalogFromMenuMocks();
      },
    };
  }

  let configRunning = false;
  let productsRunning = false;
  let configTimer: ReturnType<typeof setInterval> | null = null;
  let productsTimer: ReturnType<typeof setInterval> | null = null;

  const pollConfig = async () => {
    if (configRunning) {
      return;
    }
    configRunning = true;
    try {
      const token = await loadAccessToken();
      const client = createKioskApiClient(token ?? undefined);
      const etag = await loadConfigEtag();
      const result = await client.getConfig(etag);
      if (result.etag) {
        await saveConfigEtag(result.etag);
      }
      if (!result.notModified) {
        void prefetchKioskConfigImages(result.config, resolveKioskImageUrl);
      }
      const productCount = getCatalogProducts().length;
      callbacks.onConfigUpdated({
        runtimeConfig: mapConfigToRuntime(result.config),
        bootstrapSnapshot: buildBootstrapSnapshot(
          result.config,
          callbacks.deviceSerial,
          productCount,
          result.etag,
        ),
      });
    } catch {
      // Keep cached config on network errors
    } finally {
      configRunning = false;
    }
  };

  const refreshProducts = async (force = false) => {
    if (productsRunning) {
      return;
    }
    productsRunning = true;
    try {
      const productCount = await fetchAndApplyProducts(force);
      const token = await loadAccessToken();
      const configEtag = await loadConfigEtag();
      const configClient = createKioskApiClient(token ?? undefined);
      const configResult = await configClient.getConfig(configEtag);
      callbacks.onConfigUpdated({
        runtimeConfig: mapConfigToRuntime(configResult.config),
        bootstrapSnapshot: buildBootstrapSnapshot(
          configResult.config,
          callbacks.deviceSerial,
          productCount,
          configResult.etag,
        ),
      });
    } catch {
      // Ignore — catalog remains previous snapshot
    } finally {
      productsRunning = false;
    }
  };

  const resetProductsTimer = () => {
    if (productsTimer) {
      clearInterval(productsTimer);
    }
    productsTimer = setInterval(() => {
      void refreshProducts(false);
    }, PRODUCTS_REFRESH_MS);
  };

  const refreshProductsNow = async () => {
    await refreshProducts(true);
    resetProductsTimer();
  };

  configTimer = setInterval(() => {
    void pollConfig();
  }, CONFIG_POLL_MS);

  resetProductsTimer();

  return {
    stop: () => {
      if (configTimer) {
        clearInterval(configTimer);
      }
      if (productsTimer) {
        clearInterval(productsTimer);
      }
    },
    refreshProductsNow,
  };
}

export async function applyProductsToCatalogFromConfig(
  config: KioskConfigResponse,
  deviceSerial: string,
  configEtag: string | null,
): Promise<KioskBootstrapSnapshot> {
  const productCount = await fetchAndApplyProducts(false);
  return buildBootstrapSnapshot(config, deviceSerial, productCount, configEtag);
}

/** Refresco inmediato post-compra (sin ETag) para actualizar stock local. */
export async function forceRefreshKioskCatalogProducts(): Promise<void> {
  if (shouldUseMockApi()) {
    syncMockCatalogFromMenuMocks();
    return;
  }
  await fetchAndApplyProducts(true);
}
