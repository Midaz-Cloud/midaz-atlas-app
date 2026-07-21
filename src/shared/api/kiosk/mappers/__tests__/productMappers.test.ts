import {
  buildCategoriesFromProducts,
  mapApiProductToMenuProduct,
  mapSellableKioskApiProductsToCatalog,
  UNCATEGORIZED_SORT_ORDER,
} from '../product';
import { resolveKioskImageUrl } from '../../imageUrl';
import {
  mapLiveProductToKioskProductApi,
  mapLiveProductToMenuProduct,
  resolveCategoryImageFromLive,
} from '../liveProduct';
import type { KioskProductApiLive } from '../../liveApi.types';
import type { MenuProduct } from '@modules/ordering/menu/types';

jest.mock('@shared/config/api', () => ({
  getKioskUploadsBaseUrl: () => 'https://midazqa.dis-global.com/apis',
}));

function baseLiveCategory(
  overrides: Partial<KioskProductApiLive['category']> = {},
): KioskProductApiLive['category'] {
  return {
    id: 10,
    code: 'B',
    name: 'Bebidas',
    description: '',
    image: 'uploads/cat-bebidas.png',
    isForSale: true,
    active: true,
    sortOrder: 0,
    organizationId: 'org',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('category image mapping (UPDATE-7 §8)', () => {
  const liveProduct: KioskProductApiLive = {
    id: 1,
    name: 'Test',
    sku: 'T1',
    description: '',
    price: '1.00',
    stock: 5,
    minStock: 0,
    image: null,
    imageUrl: null,
    barcode: null,
    unit: 'un',
    productType: 'SIMPLE',
    categoryId: 10,
    organizationId: 'org',
    discountPercentage: '0',
    discountType: 'percentage',
    discountAmount: '0',
    isDiscount: false,
    taxRateId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdById: 'u',
    updatedById: 'u',
    isActive: true,
    isForSale: true,
    category: baseLiveCategory(),
    taxRate: {
      id: 'tax',
      code: 'iva_16',
      name: 'IVA',
      type: 'IVA',
      percentage: '16.000000',
      isDefault: true,
      isActive: true,
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    modifierGroups: [],
  };

  it('resolves category.image relative path to absolute URL', () => {
    expect(resolveCategoryImageFromLive(liveProduct.category)).toBe(
      'https://midazqa.dis-global.com/apis/uploads/cat-bebidas.png',
    );
  });

  it('preserves categoryImage through live → KioskProductApi', () => {
    const api = mapLiveProductToKioskProductApi(liveProduct, 'USD');
    expect(api.categoryImage).toBe('uploads/cat-bebidas.png');
  });

  it('maps categoryImageUrl on menu product via bootstrap path', () => {
    const api = mapLiveProductToKioskProductApi(liveProduct, 'USD');
    const { menuProducts } = mapSellableKioskApiProductsToCatalog([api]);
    expect(menuProducts[0].categoryImageUrl).toBe(
      'https://midazqa.dis-global.com/apis/uploads/cat-bebidas.png',
    );
  });

  it('builds category tabs with remote image from product.category.image', () => {
    const menu = mapLiveProductToMenuProduct(liveProduct, '1', 'USD');
    const categories = buildCategoriesFromProducts([menu]);
    expect(categories).toHaveLength(1);
    expect(categories[0].image).toEqual({
      uri: 'https://midazqa.dis-global.com/apis/uploads/cat-bebidas.png',
    });
  });

  it('falls back to imageUrl when image is null', () => {
    const category = {
      ...liveProduct.category,
      image: null,
      imageUrl: 'uploads/cat-fallback.png',
    };
    expect(resolveCategoryImageFromLive(category)).toBe(
      'https://midazqa.dis-global.com/apis/uploads/cat-fallback.png',
    );
  });

  it('mapApiProductToMenuProduct resolves categoryImage without options', () => {
    const menu = mapApiProductToMenuProduct(
      {
        id: 2,
        name: 'X',
        sku: 'X',
        price: 1,
        category: 'Bebidas',
        categoryCode: 'B',
        categoryImage: 'uploads/cat-bebidas.png',
        isActive: true,
        isForSale: true,
        stock: 1,
        taxRate: 16,
        isExempt: false,
      },
      '2',
    );
    expect(menu.categoryImageUrl).toBe(
      'https://midazqa.dis-global.com/apis/uploads/cat-bebidas.png',
    );
  });

  it('resolveKioskImageUrl passes through absolute URLs', () => {
    const absolute = 'https://cdn.example.com/cat.png';
    expect(resolveKioskImageUrl(absolute)).toBe(absolute);
  });
});

describe('category sortOrder (UPDATE-13 §4.1)', () => {
  function menuProduct(
    partial: Partial<MenuProduct> & Pick<MenuProduct, 'id' | 'categoryId'>,
  ): MenuProduct {
    return {
      sectionKey: 'menu.sections.cups',
      nameKey: `api.product.${partial.id}`,
      unitPrice: 1,
      ...partial,
    };
  }

  it('propagates category.sortOrder through live → api → menu', () => {
    const live: KioskProductApiLive = {
      id: 1,
      name: 'Test',
      sku: 'T1',
      description: '',
      price: '1.00',
      stock: 5,
      minStock: 0,
      image: null,
      imageUrl: null,
      barcode: null,
      unit: 'un',
      productType: 'SIMPLE',
      categoryId: 10,
      organizationId: 'org',
      discountPercentage: '0',
      discountType: 'percentage',
      discountAmount: '0',
      isDiscount: false,
      taxRateId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdById: 'u',
      updatedById: 'u',
      isActive: true,
      isForSale: true,
      category: baseLiveCategory({ sortOrder: 3, code: 'H', name: 'Hamburguesas' }),
      taxRate: null,
      modifierGroups: [],
    };

    const api = mapLiveProductToKioskProductApi(live, 'USD');
    expect(api.categorySortOrder).toBe(3);

    const menu = mapLiveProductToMenuProduct(live, '1', 'USD');
    expect(menu.categorySortOrder).toBe(3);
  });

  it('orders category tabs by sortOrder ascending, not alphabetically', () => {
    const products = [
      menuProduct({
        id: '1',
        categoryId: 'z-last-alpha',
        categoryDisplayName: 'Zetas',
        categorySortOrder: 0,
      }),
      menuProduct({
        id: '2',
        categoryId: 'a-first-alpha',
        categoryDisplayName: 'Alfas',
        categorySortOrder: 2,
      }),
      menuProduct({
        id: '3',
        categoryId: 'm-mid-alpha',
        categoryDisplayName: 'Medios',
        categorySortOrder: 1,
      }),
    ];

    const categories = buildCategoriesFromProducts(products);
    expect(categories.map((c) => c.id)).toEqual([
      'z-last-alpha',
      'm-mid-alpha',
      'a-first-alpha',
    ]);
    expect(categories.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it('places uncategorized / missing sortOrder last when using MAX sentinel', () => {
    const products = [
      menuProduct({
        id: '1',
        categoryId: 'sin-categoria',
        categoryDisplayName: 'Sin categoría',
        categorySortOrder: UNCATEGORIZED_SORT_ORDER,
      }),
      menuProduct({
        id: '2',
        categoryId: 'bebidas',
        categoryDisplayName: 'Bebidas',
        categorySortOrder: 1,
      }),
    ];

    const categories = buildCategoriesFromProducts(products);
    expect(categories.map((c) => c.id)).toEqual(['bebidas', 'sin-categoria']);
  });

  it('defaults missing category.sortOrder to 0', () => {
    const live: KioskProductApiLive = {
      id: 1,
      name: 'Test',
      sku: 'T1',
      description: '',
      price: '1.00',
      stock: 5,
      minStock: 0,
      image: null,
      imageUrl: null,
      barcode: null,
      unit: 'un',
      productType: 'SIMPLE',
      categoryId: 10,
      organizationId: 'org',
      discountPercentage: '0',
      discountType: 'percentage',
      discountAmount: '0',
      isDiscount: false,
      taxRateId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdById: 'u',
      updatedById: 'u',
      isActive: true,
      isForSale: true,
      category: baseLiveCategory({ sortOrder: undefined }),
      taxRate: null,
      modifierGroups: [],
    };

    const api = mapLiveProductToKioskProductApi(live, 'USD');
    expect(api.categorySortOrder).toBe(0);
  });
});
