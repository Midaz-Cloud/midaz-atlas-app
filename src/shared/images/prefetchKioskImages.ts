import type { ImageSourcePropType } from 'react-native';

import type { MenuCategory, MenuProduct } from '@modules/ordering/menu/types';
import { resolveKioskImageUrl } from '@shared/api/kiosk/imageUrl';
import type { KioskConfigResponse } from '@shared/api/kiosk/types';

import {
  isBundledImageSource,
  remoteUriFromImageSource,
} from './kioskImageSource';
import { ensureLocalImage, syncKioskImagesStrict } from './kioskImageCache';
import type {
  ImageCacheKind,
  ImageSyncEntry,
  ImageSyncProgress,
  ImageSyncSummary,
} from './kioskImageTypes';

/** Sync priority: lower index = download sooner. */
const IMAGE_SYNC_KIND_PRIORITY: Record<ImageCacheKind, number> = {
  config: 0,
  modifiers: 1,
  categories: 2,
  products: 3,
};

export function sortImageSyncEntriesByPriority<T extends { kind: ImageCacheKind }>(
  entries: T[],
): T[] {
  return [...entries].sort(
    (a, b) => IMAGE_SYNC_KIND_PRIORITY[a.kind] - IMAGE_SYNC_KIND_PRIORITY[b.kind],
  );
}

function pushEntry(
  entries: ImageSyncEntry[],
  seen: Set<string>,
  url: string | null | undefined,
  kind: ImageCacheKind,
): void {
  const trimmed = url?.trim();
  if (!trimmed || seen.has(trimmed)) {
    return;
  }
  seen.add(trimmed);
  entries.push({ url: trimmed, kind });
}

export function collectRemoteImageUrisFromProducts(products: MenuProduct[]): string[] {
  return collectTypedSessionImageEntries([], products)
    .filter((e) => e.kind === 'products' || e.kind === 'modifiers' || e.kind === 'categories')
    .map((e) => e.url);
}

export function collectRemoteImageUrisFromCategories(categories: MenuCategory[]): string[] {
  return collectTypedSessionImageEntries(categories, []).filter((e) => e.kind === 'categories').map((e) => e.url);
}

export function collectRemoteImageUrisFromKioskConfig(
  config: KioskConfigResponse,
  resolveUrl: (path: string | null | undefined) => string | null,
): string[] {
  return collectTypedConfigImageEntries(config, resolveUrl).map((e) => e.url);
}

export function collectCatalogImageUris(
  categories: MenuCategory[],
  products: MenuProduct[],
): string[] {
  return collectTypedSessionImageEntries(categories, products)
    .filter((e) => e.kind !== 'config')
    .map((e) => e.url);
}

export function collectCriticalCatalogImageUris(
  categories: MenuCategory[],
  products: MenuProduct[],
): string[] {
  return collectTypedSessionImageEntries(categories, products)
    .filter((e) => e.kind === 'categories' || e.kind === 'products')
    .map((e) => e.url);
}

export function collectModifierImageUris(products: MenuProduct[]): string[] {
  return collectTypedSessionImageEntries([], products)
    .filter((e) => e.kind === 'modifiers')
    .map((e) => e.url);
}

export function collectTypedConfigImageEntries(
  config: KioskConfigResponse,
  resolveUrl: (path: string | null | undefined) => string | null,
): ImageSyncEntry[] {
  const entries: ImageSyncEntry[] = [];
  const seen = new Set<string>();
  pushEntry(entries, seen, resolveUrl(config.appearance.coverImage), 'config');
  pushEntry(entries, seen, resolveUrl(config.appearance.pickupImage), 'config');
  pushEntry(entries, seen, resolveUrl(config.appearance.inStoreImage), 'config');
  pushEntry(entries, seen, resolveUrl(config.organization.logo), 'config');
  return entries;
}

export function collectTypedSessionImageEntries(
  categories: MenuCategory[],
  products: MenuProduct[],
): ImageSyncEntry[] {
  const entries: ImageSyncEntry[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    if (category.image && !isBundledImageSource(category.image)) {
      pushEntry(entries, seen, remoteUriFromImageSource(category.image), 'categories');
    }
  }

  for (const product of products) {
    if (product.image && !isBundledImageSource(product.image)) {
      pushEntry(entries, seen, remoteUriFromImageSource(product.image), 'products');
    }
    if (product.detailImage && !isBundledImageSource(product.detailImage)) {
      pushEntry(entries, seen, remoteUriFromImageSource(product.detailImage), 'products');
    }
    pushEntry(entries, seen, product.categoryImageUrl, 'categories');
    for (const group of product.modifierGroups ?? []) {
      for (const option of group.options) {
        pushEntry(entries, seen, resolveKioskImageUrl(option.imageUrl), 'modifiers');
      }
    }
  }

  return entries;
}

/** All typed entries for bootstrap: config + catalog + modifiers. */
export function collectTypedKioskSessionImageEntries(
  config: KioskConfigResponse,
  categories: MenuCategory[],
  products: MenuProduct[],
  resolveUrl: (path: string | null | undefined) => string | null = resolveKioskImageUrl,
): ImageSyncEntry[] {
  const entries: ImageSyncEntry[] = [];
  const seen = new Set<string>();
  for (const entry of [
    ...collectTypedConfigImageEntries(config, resolveUrl),
    ...collectTypedSessionImageEntries(categories, products),
  ]) {
    if (!seen.has(entry.url)) {
      seen.add(entry.url);
      entries.push(entry);
    }
  }
  return sortImageSyncEntriesByPriority(entries);
}

/**
 * Strict bootstrap/catalog sync: verify each image on disk, download missing, report progress.
 */
export async function syncKioskSessionImages(
  config: KioskConfigResponse,
  categories: MenuCategory[],
  products: MenuProduct[],
  options?: {
    resolveUrl?: (path: string | null | undefined) => string | null;
    onProgress?: (progress: ImageSyncProgress) => void;
  },
): Promise<ImageSyncSummary> {
  const entries = collectTypedKioskSessionImageEntries(
    config,
    categories,
    products,
    options?.resolveUrl ?? resolveKioskImageUrl,
  );
  return syncKioskImagesStrict(entries, options?.onProgress);
}

export async function prefetchCatalogImages(
  categories: MenuCategory[],
  products: MenuProduct[],
  onProgress?: (progress: ImageSyncProgress) => void,
): Promise<ImageSyncSummary> {
  const entries = collectTypedSessionImageEntries(categories, products);
  return syncKioskImagesStrict(entries, onProgress);
}

export async function prefetchKioskConfigImages(
  config: KioskConfigResponse,
  resolveUrl: (path: string | null | undefined) => string | null,
  onProgress?: (progress: ImageSyncProgress) => void,
): Promise<ImageSyncSummary> {
  return syncKioskImagesStrict(collectTypedConfigImageEntries(config, resolveUrl), onProgress);
}

/** @deprecated Use syncKioskSessionImages — kept for call-site compatibility. */
export async function prefetchKioskSessionImages(
  config: KioskConfigResponse,
  categories: MenuCategory[],
  products: MenuProduct[],
  resolveUrl: (path: string | null | undefined) => string | null = resolveKioskImageUrl,
  onProgress?: (progress: ImageSyncProgress) => void,
): Promise<ImageSyncSummary> {
  return syncKioskSessionImages(config, categories, products, { resolveUrl, onProgress });
}

export function prefetchImageSource(source?: ImageSourcePropType): void {
  if (!source || isBundledImageSource(source)) {
    return;
  }
  const uri = remoteUriFromImageSource(source);
  if (uri) {
    void ensureLocalImage({ url: uri, kind: 'products' });
  }
}
