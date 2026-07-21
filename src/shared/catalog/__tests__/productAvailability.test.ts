import {
  isProductAvailableForSale,
  isProductSoldOut,
  resolveProductAvailable,
} from '../productAvailability';

describe('productAvailability', () => {
  it('prefers isAvailable from API over stock', () => {
    expect(
      isProductAvailableForSale({
        isActive: true,
        stock: 10,
        available: 0,
        isAvailable: false,
      }),
    ).toBe(false);
  });

  it('falls back to stock when isAvailable is omitted', () => {
    expect(
      isProductAvailableForSale({
        isActive: true,
        stock: 0,
      }),
    ).toBe(false);
    expect(
      isProductAvailableForSale({
        isActive: true,
        stock: 3,
      }),
    ).toBe(true);
  });

  it('uses available over stock for quantity cap', () => {
    expect(
      resolveProductAvailable({
        stock: 10,
        available: 4,
      }),
    ).toBe(4);
  });

  it('marks inactive products as sold out', () => {
    expect(
      isProductSoldOut({
        isActive: false,
        stock: 99,
        isAvailable: true,
      }),
    ).toBe(true);
  });
});
