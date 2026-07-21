import type { MenuProduct } from '@modules/ordering/menu/types';

import {
  findCatalogProductByScanCode,
  setCatalog,
} from '../catalogStore';

function makeProduct(overrides: Partial<MenuProduct> & Pick<MenuProduct, 'id'>): MenuProduct {
  return {
    categoryId: 'general',
    sectionKey: 'menu.sections.cups',
    nameKey: `product.${overrides.id}`,
    unitPrice: 1,
    ...overrides,
  };
}

describe('findCatalogProductByScanCode', () => {
  beforeEach(() => {
    setCatalog(
      [],
      [
        makeProduct({
          id: '1',
          barcode: '7501234567890',
          sku: 'SKU-001',
        }),
        makeProduct({
          id: '2',
          sku: 'SKU-ONLY',
        }),
      ],
      new Map([
        ['1', 1],
        ['2', 2],
      ]),
    );
  });

  it('finds product by barcode', () => {
    expect(findCatalogProductByScanCode('7501234567890')?.id).toBe('1');
  });

  it('normalizes whitespace in scanned code', () => {
    expect(findCatalogProductByScanCode(' 7501234567890 \n')?.id).toBe('1');
  });

  it('falls back to sku when barcode missing', () => {
    expect(findCatalogProductByScanCode('SKU-ONLY')?.id).toBe('2');
  });

  it('prefers barcode over sku when both match different products', () => {
    setCatalog(
      [],
      [
        makeProduct({ id: 'a', barcode: 'CODE123', sku: 'OTHER' }),
        makeProduct({ id: 'b', sku: 'CODE123' }),
      ],
      new Map([
        ['a', 10],
        ['b', 11],
      ]),
    );
    expect(findCatalogProductByScanCode('CODE123')?.id).toBe('a');
  });

  it('returns undefined for unknown code', () => {
    expect(findCatalogProductByScanCode('UNKNOWN')).toBeUndefined();
    expect(findCatalogProductByScanCode('')).toBeUndefined();
  });
});
