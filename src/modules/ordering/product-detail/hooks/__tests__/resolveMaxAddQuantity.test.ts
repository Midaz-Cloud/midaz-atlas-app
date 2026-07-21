import { resolveMaxAddQuantity } from '../../../menu/productAvailability';
import type { MenuProduct } from '../../../menu/types';

function product(overrides: Partial<MenuProduct> = {}): MenuProduct {
  return {
    id: 'p1',
    categoryId: 'cat',
    sectionKey: 'menu.sections.cups',
    nameKey: 'menu.products.p1',
    unitPrice: 1,
    ...overrides,
  };
}

describe('resolveMaxAddQuantity', () => {
  it('returns remaining stock minus cart quantity', () => {
    expect(resolveMaxAddQuantity(product({ available: 3 }), 1)).toBe(2);
  });

  it('returns 0 when cart already holds all stock', () => {
    expect(resolveMaxAddQuantity(product({ available: 1 }), 1)).toBe(0);
  });

  it('returns undefined when availability is unknown', () => {
    expect(resolveMaxAddQuantity(product(), 0)).toBeUndefined();
  });
});
