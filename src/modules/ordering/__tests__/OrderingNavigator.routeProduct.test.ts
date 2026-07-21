import type { ImageSourcePropType } from 'react-native';

import { resolveOrderingRouteProduct } from '../OrderingNavigator';
import type { MenuProduct } from '../menu/types';

const sampleProduct: MenuProduct = {
  id: 'p1',
  nameKey: 'product.p1',
  sectionKey: 'section.p1',
  categoryId: 'c1',
  unitPrice: 1.5,
  image: { uri: 'https://example.com/a.png' } as ImageSourcePropType,
};

describe('resolveOrderingRouteProduct', () => {
  it('returns product snapshot from product-detail route', () => {
    const product = resolveOrderingRouteProduct({
      name: 'product-detail',
      productId: 'p1',
      product: sampleProduct,
    });
    expect(product?.id).toBe('p1');
  });

  it('returns undefined for menu route', () => {
    expect(resolveOrderingRouteProduct({ name: 'menu' })).toBeUndefined();
  });

  it('returns product snapshot from modifiers route', () => {
    const product = resolveOrderingRouteProduct({
      name: 'modifiers',
      productId: 'p1',
      product: sampleProduct,
      quantity: 1,
      unitIndex: 0,
      groupIndex: 0,
      selectionsByUnit: {},
      source: 'api',
    });
    expect(product?.id).toBe('p1');
  });
});
