import type { ImageSourcePropType } from 'react-native';

import type { MenuCategory, MenuProduct } from '@modules/ordering/menu/types';
import type { ProductModifierGroup } from '@modules/ordering/menu/modifierTypes';

import { resolveKioskImageUrl } from '../imageUrl';
import type { KioskProductApi } from '../types';
import {
  isProductSoldOut,
  resolveProductAvailable,
} from '@shared/catalog/productAvailability';

/** Products without category go last in tabs (UPDATE-13 §4.1). */
export const UNCATEGORIZED_SORT_ORDER = Number.MAX_SAFE_INTEGER;

function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCategorySortOrder(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 0;
}

export type MapApiProductOptions = {
  categoryId?: string;
  categoryImageUrl?: string | null;
  categorySortOrder?: number;
  soldOut?: boolean;
  modifierGroups?: ProductModifierGroup[];
  hasModifiers?: boolean;
};

function categoryImageSource(uri: string | null | undefined): MenuCategory['image'] {
  return uri ? { uri } : undefined;
}

/**
 * Groups products into category tabs ordered by backend `category.sortOrder`
 * (UPDATE-13 §4.1). Insertion order is preserved for ties (stable sort).
 */
export function buildCategoriesFromProducts(
  products: MenuProduct[],
): MenuCategory[] {
  const seen = new Map<string, MenuCategory>();
  for (const product of products) {
    const slug = product.categoryId;
    const remoteCategoryUri = product.categoryImageUrl;
    const sortOrder = resolveCategorySortOrder(product.categorySortOrder);
    const existing = seen.get(slug);
    if (!existing) {
      seen.set(slug, {
        id: slug,
        nameKey: `menu.categories.${slug}`,
        displayName: product.categoryDisplayName,
        sortOrder,
        image: categoryImageSource(remoteCategoryUri),
      });
      continue;
    }
    if (!existing.image && remoteCategoryUri) {
      seen.set(slug, {
        ...existing,
        image: categoryImageSource(remoteCategoryUri),
      });
    }
  }
  return [...seen.values()].sort((a, b) => {
    const orderA = a.sortOrder ?? UNCATEGORIZED_SORT_ORDER;
    const orderB = b.sortOrder ?? UNCATEGORIZED_SORT_ORDER;
    return orderA - orderB;
  });
}

export function mapApiProductToMenuProduct(
  api: KioskProductApi,
  catalogProductId: string,
  localImage?: ImageSourcePropType,
  options?: MapApiProductOptions,
): MenuProduct {
  const categorySlug =
    options?.categoryId ??
    (api.categoryCode
      ? api.categoryCode.toLowerCase()
      : slugifyCategory(api.category) || 'general');
  const remoteUri = resolveKioskImageUrl(api.image ?? api.imageUrl);
  const categoryImageUrl =
    options?.categoryImageUrl ?? resolveKioskImageUrl(api.categoryImage) ?? undefined;
  const categorySortOrder = resolveCategorySortOrder(
    options?.categorySortOrder ?? api.categorySortOrder,
  );

  return {
    id: catalogProductId,
    apiProductId: api.id,
    categoryId: categorySlug,
    categoryDisplayName: api.category,
    categorySortOrder,
    categoryImageUrl,
    sectionKey: 'menu.sections.cups',
    nameKey: `api.product.${api.id}`,
    displayName: api.name,
    displayDescription: api.description || undefined,
    unitPrice: api.price,
    unitPriceVes: api.priceVES,
    taxRate: api.taxRate,
    isExempt: api.isExempt,
    sku: api.sku,
    barcode: api.barcode ?? null,
    image: localImage ?? (remoteUri ? { uri: remoteUri } : undefined),
    soldOut: options?.soldOut ?? isProductSoldOut(api),
    available: resolveProductAvailable(api),
    modifierGroups: options?.modifierGroups ?? api.modifierGroups,
    hasModifiers:
      options?.hasModifiers ??
      (options?.modifierGroups?.length ?? api.modifierGroups?.length ?? 0) > 0,
  };
}

/** Maps sellable API rows to menu catalog (bootstrap / catalog sync). */
export function mapSellableKioskApiProductsToCatalog(apis: KioskProductApi[]): {
  menuProducts: MenuProduct[];
  idMap: Map<string, number>;
} {
  const idMap = new Map<string, number>();
  const menuProducts = apis.map((api) => {
    const catalogId = String(api.id);
    idMap.set(catalogId, api.id);
    return mapApiProductToMenuProduct(api, catalogId);
  });
  return { menuProducts, idMap };
}

export function mapMenuProductToApiProduct(
  product: MenuProduct,
  numericId: number,
): KioskProductApi {
  return {
    id: numericId,
    name: product.displayName ?? product.id,
    sku: product.sku ?? product.id,
    barcode: product.barcode ?? null,
    description: product.displayDescription ?? '',
    price: product.unitPrice,
    priceVES: product.unitPriceVes,
    category: product.categoryDisplayName ?? product.categoryId,
    categorySortOrder: product.categorySortOrder,
    image: null,
    imageUrl: null,
    isActive: !product.soldOut,
    isForSale: true,
    stock: product.soldOut ? 0 : 99,
    taxRate: product.taxRate ?? 16,
    isExempt: product.isExempt ?? false,
  };
}
