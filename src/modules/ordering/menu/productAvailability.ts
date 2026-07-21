import type { MenuProduct } from './types';
import { resolveProductAvailable } from '@shared/catalog/productAvailability';

/** Product cannot be added or opened (sold out per catalog sync). */
export function isProductUnavailable(product: MenuProduct): boolean {
  return product.soldOut === true;
}

/** Max units the user can still add (detail / menu), accounting for cart. */
export function resolveMaxAddQuantity(
  product: MenuProduct,
  cartQuantity = 0,
): number | undefined {
  if (product.available == null) {
    return undefined;
  }
  return Math.max(0, resolveProductAvailable(product) - cartQuantity);
}
