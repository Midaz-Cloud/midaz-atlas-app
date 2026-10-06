import {
  buildCategoriesFromProducts,
  mapSellableKioskApiProductsToCatalog,
  type KioskProductsResponse,
} from '@shared/api/kiosk';
import { setCatalog } from '@shared/catalog/catalogStore';

/** Carga en el catálogo en memoria los productos vendibles de un GET /kiosk/products (en vivo o de caché). */
export function applyProductsToCatalog(products: KioskProductsResponse) {
  const sellable = products.data.filter((api) => api.isForSale !== false);
  const { menuProducts, idMap } = mapSellableKioskApiProductsToCatalog(sellable);
  const categories = buildCategoriesFromProducts(menuProducts);
  setCatalog(categories, menuProducts, idMap);
  return { categories, menuProducts };
}
