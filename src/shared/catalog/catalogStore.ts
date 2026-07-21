import type { MenuCategory, MenuProduct } from '@modules/ordering/menu/types';

import { normalizeScanCode } from './scanCode';

export type CatalogEntry = {
  product: MenuProduct;
  apiProductId: number;
};

let categories: MenuCategory[] = [];
let products: MenuProduct[] = [];
let productIdToApiId = new Map<string, number>();
let apiIdToProductId = new Map<number, string>();
let barcodeToProduct = new Map<string, MenuProduct>();
let skuToProduct = new Map<string, MenuProduct>();

export type ScanCodeLookupResult = {
  normalizedCode: string;
  matchField: 'barcode' | 'sku' | null;
  product: MenuProduct | null;
};

export type ScanIndexDebugInfo = {
  productCount: number;
  barcodeIndexSize: number;
  skuIndexSize: number;
  barcodeKeys: string[];
  skuKeysSample: string[];
};

function rebuildScanIndex(nextProducts: MenuProduct[]): void {
  barcodeToProduct = new Map();
  skuToProduct = new Map();
  for (const product of nextProducts) {
    if (product.barcode) {
      const key = normalizeScanCode(product.barcode);
      if (key && !barcodeToProduct.has(key)) {
        barcodeToProduct.set(key, product);
      }
    }
    if (product.sku) {
      const key = normalizeScanCode(product.sku);
      if (key && !skuToProduct.has(key)) {
        skuToProduct.set(key, product);
      }
    }
  }
}

export function getScanIndexDebugInfo(): ScanIndexDebugInfo {
  const barcodeKeys = [...barcodeToProduct.keys()];
  const skuKeys = [...skuToProduct.keys()];
  return {
    productCount: products.length,
    barcodeIndexSize: barcodeKeys.length,
    skuIndexSize: skuKeys.length,
    barcodeKeys,
    skuKeysSample: skuKeys.slice(0, 25),
  };
}

/** Resolves scan code with match metadata (for lookup + logcat diagnostics). */
export function lookupScanCode(rawCode: string): ScanCodeLookupResult {
  const normalizedCode = normalizeScanCode(rawCode);
  if (!normalizedCode) {
    return { normalizedCode: '', matchField: null, product: null };
  }
  const byBarcode = barcodeToProduct.get(normalizedCode);
  if (byBarcode) {
    return { normalizedCode, matchField: 'barcode', product: byBarcode };
  }
  const bySku = skuToProduct.get(normalizedCode);
  if (bySku) {
    return { normalizedCode, matchField: 'sku', product: bySku };
  }
  return { normalizedCode, matchField: null, product: null };
}

/** Resolves a scanned code to a catalog product (barcode first, then sku). */
export function findCatalogProductByScanCode(rawCode: string): MenuProduct | undefined {
  return lookupScanCode(rawCode).product ?? undefined;
}

export function setCatalog(
  nextCategories: MenuCategory[],
  nextProducts: MenuProduct[],
  idMap: Map<string, number>,
): void {
  categories = nextCategories;
  products = nextProducts;
  productIdToApiId = new Map(idMap);
  apiIdToProductId = new Map(
    [...idMap.entries()].map(([productId, apiId]) => [apiId, productId]),
  );
  rebuildScanIndex(nextProducts);
}

export function getCatalogCategories(): MenuCategory[] {
  return categories;
}

export function getCatalogProducts(): MenuProduct[] {
  return products;
}

export function getCatalogEntryByLineProductId(productId: string): CatalogEntry | undefined {
  const product = products.find((p) => p.id === productId);
  const apiProductId = productIdToApiId.get(productId) ?? product?.apiProductId;
  if (!product || apiProductId == null) {
    return undefined;
  }
  return { product, apiProductId };
}

export function findCatalogProduct(productId: string): MenuProduct | undefined {
  return products.find((p) => p.id === productId);
}

export function getApiProductId(productId: string): number | undefined {
  return productIdToApiId.get(productId) ?? findCatalogProduct(productId)?.apiProductId;
}

export function findCatalogProductByApiId(apiId: number): MenuProduct | undefined {
  const productId = apiIdToProductId.get(apiId);
  if (!productId) {
    return products.find((p) => p.apiProductId === apiId);
  }
  return findCatalogProduct(productId);
}
