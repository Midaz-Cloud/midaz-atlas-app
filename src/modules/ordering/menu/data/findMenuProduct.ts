import { findCatalogProduct } from '@shared/catalog/catalogStore';

import { mockMenuProducts } from './mockMenuCatalog';
import type { MenuProduct } from '../types';

export function findMenuProduct(productId: string): MenuProduct | undefined {
  return findCatalogProduct(productId) ?? mockMenuProducts.find((p) => p.id === productId);
}
