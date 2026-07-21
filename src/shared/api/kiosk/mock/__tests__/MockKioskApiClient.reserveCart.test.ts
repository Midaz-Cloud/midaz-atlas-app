import { MockKioskApiClient } from '../../mock/MockKioskApiClient';
import { syncMockCatalogFromMenuMocks } from '../../mock/buildMockFixtures';

jest.mock('@modules/ordering/menu/data/mockMenuCatalog', () => ({
  mockMenuCategories: [],
  mockMenuProducts: [
    {
      id: 'p1',
      categoryId: 'cat',
      sectionKey: 'menu.sections.cups',
      nameKey: 'menu.products.p1',
      unitPrice: 1,
      soldOut: false,
    },
    {
      id: 'p2',
      categoryId: 'cat',
      sectionKey: 'menu.sections.cups',
      nameKey: 'menu.products.p2',
      unitPrice: 2,
      soldOut: true,
    },
  ],
}));

describe('MockKioskApiClient.reserveCart', () => {
  beforeEach(() => {
    syncMockCatalogFromMenuMocks();
  });

  it('returns reservationId when all items can be reserved', async () => {
    const client = new MockKioskApiClient();
    const response = await client.reserveCart({
      items: [{ productId: 1, quantity: 1 }],
      ttlMinutes: 5,
    });

    expect(response.allReserved).toBe(true);
    expect(response.reservationId).toMatch(/^mock-reservation-/);
  });

  it('fails atomically when any item lacks stock', async () => {
    const client = new MockKioskApiClient();
    const response = await client.reserveCart({
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
      ttlMinutes: 5,
    });

    expect(response.allReserved).toBe(false);
    expect(response.reservationId).toBeNull();
    expect(response.items.some((item) => !item.reserved)).toBe(true);
  });
});
