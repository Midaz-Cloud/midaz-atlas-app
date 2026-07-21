import type { ImageSourcePropType } from 'react-native';

import type { MenuProduct } from '@modules/ordering/menu/types';

import { resolveKioskImageUrl } from '../imageUrl';
import type { KioskProductApiLive, KioskProductCategoryLive } from '../liveApi.types';
import type { KioskProductApi, KioskProductsResponse } from '../types';
import { resolveUnitPricesFromApi } from '@shared/pricing/kioskPricing';

import {
  isProductAvailableForSale,
  isProductSoldOut,
  resolveProductAvailable,
} from '@shared/catalog/productAvailability';

import { indexRawModifierGroupsFromProductsBody } from '@shared/catalog/rawModifierGroupsDebugStore';

import { mapLiveModifierGroups } from './modifierGroups';
import { mapApiProductToMenuProduct } from './product';

function parseDecimalString(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function parseTaxPercentage(taxRate: KioskProductApiLive['taxRate'] | null): number {
  if (!taxRate) {
    return 0;
  }
  return parseDecimalString(taxRate.percentage);
}

function isExemptFromTaxRate(taxRate: KioskProductApiLive['taxRate'] | null): boolean {
  if (!taxRate) {
    return true;
  }
  const pct = parseTaxPercentage(taxRate);
  return pct === 0 || taxRate.type.toUpperCase() === 'EXENTO';
}

function categoryIdFromLive(live: KioskProductApiLive): string {
  const code = live.category.code?.trim();
  if (code) {
    return code.toLowerCase();
  }
  return live.category.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveProductImage(live: KioskProductApiLive): ImageSourcePropType | undefined {
  const uri = resolveKioskImageUrl(live.image ?? live.imageUrl);
  if (uri) {
    return { uri };
  }
  return undefined;
}

/** `product.category.image` per UPDATE-7 §8 (`uploads/...`). */
export function resolveCategoryImageFromLive(
  category: Pick<KioskProductCategoryLive, 'image'> & { imageUrl?: string | null },
): string | null {
  return resolveKioskImageUrl(category.image ?? category.imageUrl ?? null);
}

/** Sold out when inactive or not available per UPDATE-12. */
export function isLiveProductSoldOut(live: KioskProductApiLive): boolean {
  return isProductSoldOut({
    isActive: live.isActive,
    stock: live.stock,
    available: live.available,
    isAvailable: live.isAvailable,
  });
}

/** Converts one live API product row to guide `KioskProductApi`. */
export function mapLiveProductToKioskProductApi(
  live: KioskProductApiLive,
  primaryCurrency: string,
): KioskProductApi {
  const { unitPrice, unitPriceVes } = resolveUnitPricesFromApi(
    live.price,
    live.priceVES,
    primaryCurrency,
  );
  const taxRate = parseTaxPercentage(live.taxRate);
  return {
    id: live.id,
    name: live.name,
    sku: live.sku,
    barcode: live.barcode,
    description: live.description,
    price: unitPrice,
    priceVES: unitPriceVes,
    category: live.category.name,
    categoryCode: live.category.code,
    categorySortOrder:
      typeof live.category.sortOrder === 'number' && Number.isFinite(live.category.sortOrder)
        ? live.category.sortOrder
        : 0,
    categoryImage: live.category.image ?? live.category.imageUrl ?? null,
    image: live.image,
    imageUrl: live.imageUrl,
    isActive: live.isActive,
    isForSale: live.isForSale ?? true,
    stock: live.stock,
    available: live.available ?? live.stock,
    isAvailable:
      live.isAvailable ??
      isProductAvailableForSale({
        isActive: live.isActive,
        stock: live.stock,
        available: live.available,
      }),
    taxRate,
    isExempt: isExemptFromTaxRate(live.taxRate),
    modifierGroups: mapLiveModifierGroups(live.modifierGroups),
  };
}

export function mapLiveProductToMenuProduct(
  live: KioskProductApiLive,
  catalogProductId: string,
  primaryCurrency: string,
): MenuProduct {
  const api = mapLiveProductToKioskProductApi(live, primaryCurrency);
  const modifierGroups = mapLiveModifierGroups(live.modifierGroups);
  return mapApiProductToMenuProduct(api, catalogProductId, resolveProductImage(live), {
    categoryId: categoryIdFromLive(live),
    categoryImageUrl: resolveCategoryImageFromLive(live.category),
    categorySortOrder: api.categorySortOrder,
    soldOut: isLiveProductSoldOut(live),
    modifierGroups,
    hasModifiers: modifierGroups.length > 0,
  });
}

function isLiveProductRow(item: unknown): item is KioskProductApiLive {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const o = item as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    typeof o.price === 'string' &&
    typeof o.category === 'object' &&
    o.category != null
  );
}

/**
 * Normalizes GET /kiosk/products body: root array (live) or `{ data: [] }` (guide/mock).
 */
export function parseKioskProductsResponse(
  body: unknown,
  primaryCurrency = 'USD',
): KioskProductsResponse {
  if (Array.isArray(body)) {
    indexRawModifierGroupsFromProductsBody(body);
    return {
      data: body
        .filter((row) =>
          isLiveProductRow(row) ? row.isForSale !== false : true,
        )
        .map((row) =>
          isLiveProductRow(row)
            ? mapLiveProductToKioskProductApi(row, primaryCurrency)
            : (row as KioskProductApi),
        ),
    };
  }
  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    Array.isArray((body as KioskProductsResponse).data)
  ) {
    const wrapped = body as KioskProductsResponse;
    return {
      data: wrapped.data
        .filter((row) => (isLiveProductRow(row) ? row.isForSale !== false : true))
        .map((row) =>
          isLiveProductRow(row)
            ? mapLiveProductToKioskProductApi(row, primaryCurrency)
            : row,
        ),
    };
  }
  return { data: [] };
}
