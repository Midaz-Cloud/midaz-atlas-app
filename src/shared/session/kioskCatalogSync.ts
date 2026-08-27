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
): Promise<{ productCount: number; changed: boolean }> {
  const token = await loadAccessToken();
  const client = createKioskApiClient(token ?? undefined);
  const etag = force ? null : await loadProductsEtag();
  const productsResponse = await client.getProducts(etag);
  if (productsResponse.notModified && !force) {
    return { productCount: getCatalogProducts().length, changed: false };
  }
  return { productCount: await applyProductsResponse(productsResponse), changed: true };
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
  /** Última config conocida, para poder emitir sin volver a pedirla por HTTP. */
  let lastConfig: KioskConfigResponse | null = null;
  let lastConfigEtag: string | null = null;

  /**
   * `catalogStore` no tiene suscriptores (la UI lo lee imperativamente en
   * `useMenuScreen`), así que esta emisión es lo ÚNICO que repinta el menú tras
   * un cambio de catálogo. Emitir solo cuando algo cambió de verdad: hacerlo en
   * cada tick provocaba un re-render del árbol completo + `applyLanguagePolicy()`
   * cada minuto, incluso con un cliente a mitad del checkout.
   */
  const emitSnapshot = (productCount: number) => {
    if (!lastConfig) {
      return;
    }
    callbacks.onConfigUpdated({
      runtimeConfig: mapConfigToRuntime(lastConfig),
      bootstrapSnapshot: buildBootstrapSnapshot(
        lastConfig,
        callbacks.deviceSerial,
        productCount,
        lastConfigEtag,
      ),
    });
  };

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
      const isFirstConfig = lastConfig === null;
      lastConfig = result.config;
      lastConfigEtag = result.etag;
      if (result.notModified && !isFirstConfig) {
        return;
      }
      void prefetchKioskConfigImages(result.config, resolveKioskImageUrl);
      emitSnapshot(getCatalogProducts().length);
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
      // Sin GET /kiosk/config acá: `pollConfig` corre en su propio intervalo y
      // `lastConfig` alcanza para reconstruir el snapshot. Pedirla también acá
      // duplicaba la request cada minuto sin aportar nada.
      const { productCount, changed } = await fetchAndApplyProducts(force);
      if (changed) {
        emitSnapshot(productCount);
      }
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
  const { productCount } = await fetchAndApplyProducts(false);
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
