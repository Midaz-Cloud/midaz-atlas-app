import { findMenuProduct } from '../menu/data/findMenuProduct';

/** Categoría del producto agotado para filtrar similares en P17. */
export function getSimilarProductsCategoryId(productId: string): string | undefined {
  return findMenuProduct(productId)?.categoryId;
}
