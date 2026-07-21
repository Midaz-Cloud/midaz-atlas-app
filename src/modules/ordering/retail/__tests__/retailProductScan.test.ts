import type { MenuProduct } from '@modules/ordering/menu/types';

import { productRequiresCustomization } from '../retailProductScan';

jest.mock('@shared/config/api', () => ({
  shouldUseMockApi: () => true,
}));

function makeProduct(overrides: Partial<MenuProduct> = {}): MenuProduct {
  return {
    id: 'p1',
    categoryId: 'general',
    sectionKey: 'menu.sections.cups',
    nameKey: 'menu.products.cupSmall.name',
    unitPrice: 1,
    ...overrides,
  };
}

describe('productRequiresCustomization', () => {
  it('returns true when product has API modifier groups', () => {
    expect(
      productRequiresCustomization(
        makeProduct({
          modifierGroups: [
            {
              id: 'g1',
              name: 'Extras',
              isRequired: false,
              minSelection: 0,
              maxSelection: 1,
              quotaFree: 0,
              quotaFreeBySize: null,
              excessPrice: 0,
              sortOrder: 0,
              options: [],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns true when mock modifier flow id is set', () => {
    expect(
      productRequiresCustomization(makeProduct({ modifierFlowId: 'cup-large-flow' })),
    ).toBe(true);
  });

  it('returns false for simple retail product', () => {
    expect(productRequiresCustomization(makeProduct({ sku: 'SKU-1', barcode: '123' }))).toBe(
      false,
    );
  });
});
