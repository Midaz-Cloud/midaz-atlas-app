import { resolveMaxAddQuantity } from '@modules/ordering/menu/productAvailability';

import {
  isLiveProductSoldOut,
  mapLiveProductToKioskProductApi,
  mapLiveProductToMenuProduct,
} from '../liveProduct';
import type { KioskProductApiLive } from '../../liveApi.types';

function baseLive(overrides: Partial<KioskProductApiLive> = {}): KioskProductApiLive {
  return {
    id: 1,
    name: 'Test',
    image: null,
    sku: 'SKU',
    description: '',
    price: '1.00',
    stock: 10,
    minStock: 0,
    barcode: null,
    unit: 'und',
    imageUrl: null,
    productType: 'product',
    categoryId: 1,
    organizationId: 'org',
    discountPercentage: '0',
    discountType: 'none',
    discountAmount: '0',
    isDiscount: false,
    taxRateId: null,
    isActive: true,
    isForSale: true,
    createdAt: '',
    updatedAt: '',
    createdById: '',
    updatedById: '',
    category: {
      id: 1,
      name: 'Cat',
      code: 'CAT',
      description: '',
      image: null,
      imageUrl: null,
      organizationId: 'org',
      isForSale: true,
      active: true,
      createdAt: '',
      updatedAt: '',
    },
    taxRate: null,
    ...overrides,
  };
}

describe('mapLiveProduct soldOut with isAvailable', () => {
  it('is sold out when isAvailable is false even with legacy stock', () => {
    const live = baseLive({ stock: 99, isAvailable: false, available: 0 });
    expect(isLiveProductSoldOut(live)).toBe(true);
    const api = mapLiveProductToKioskProductApi(live, 'USD');
    expect(api.isAvailable).toBe(false);
    expect(api.available).toBe(0);
  });

  it('is available when isAvailable is true', () => {
    const live = baseLive({ stock: 0, isAvailable: true, available: 2 });
    expect(isLiveProductSoldOut(live)).toBe(false);
  });
});

describe('mapLiveProductToMenuProduct stock sin límite', () => {
  it('COMBO con stock/available null queda sin tope (no 0)', () => {
    const live = baseLive({
      productType: 'COMBO',
      stock: null,
      available: null,
      isAvailable: true,
    } as unknown as Partial<KioskProductApiLive>);
    const menu = mapLiveProductToMenuProduct(live, 'p-29', 'USD');
    expect(menu.soldOut).toBe(false);
    expect(menu.available).toBeUndefined();
    expect(resolveMaxAddQuantity(menu)).toBeUndefined();
  });

  it('con stock numérico sigue topeando por disponibilidad', () => {
    const live = baseLive({ stock: 3, available: 2, isAvailable: true });
    const menu = mapLiveProductToMenuProduct(live, 'p-1', 'USD');
    expect(menu.available).toBe(2);
    expect(resolveMaxAddQuantity(menu, 1)).toBe(1);
  });
});
