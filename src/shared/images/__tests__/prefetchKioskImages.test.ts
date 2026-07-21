import {
  collectTypedConfigImageEntries,
  collectTypedSessionImageEntries,
  collectTypedKioskSessionImageEntries,
} from '../prefetchKioskImages';
import type { MenuProduct } from '@modules/ordering/menu/types';
import type { KioskConfigResponse } from '@shared/api/kiosk/types';

jest.mock('@shared/config/api', () => ({
  getKioskUploadsBaseUrl: () => 'https://midazqa.dis-global.com',
}));

describe('typed image collectors', () => {
  it('tags config images as config', () => {
    const config = {
      appearance: {
        coverImage: 'uploads/cover.jpg',
        pickupImage: null,
        inStoreImage: 'uploads/instore.png',
      },
      organization: { logo: 'uploads/logo.png' },
    } as unknown as KioskConfigResponse;

    const entries = collectTypedConfigImageEntries(
      config,
      (path) => (path ? `https://midazqa.dis-global.com/${path}` : null),
    );

    expect(entries.every((e) => e.kind === 'config')).toBe(true);
    expect(entries.map((e) => e.url)).toEqual(
      expect.arrayContaining([
        'https://midazqa.dis-global.com/uploads/cover.jpg',
        'https://midazqa.dis-global.com/uploads/instore.png',
        'https://midazqa.dis-global.com/uploads/logo.png',
      ]),
    );
  });

  it('tags products, categories and modifiers correctly', () => {
    const product: MenuProduct = {
      id: 'p1',
      categoryId: 'c1',
      sectionKey: 's',
      nameKey: 'n',
      unitPrice: 1,
      image: { uri: 'https://midazqa.dis-global.com/uploads/burger.jpg' },
      categoryImageUrl: 'https://midazqa.dis-global.com/uploads/cat.png',
      modifierGroups: [
        {
          id: 'g1',
          name: 'Extras',
          isRequired: false,
          minSelection: 0,
          maxSelection: 2,
          quotaFree: 0,
          quotaFreeBySize: null,
          excessPrice: 0,
          sortOrder: 0,
          options: [
            {
              id: 'o1',
              name: 'Queso',
              additionalPrice: 1,
              sortOrder: 0,
              imageUrl: 'uploads/queso.png',
            },
          ],
        },
      ],
    };

    const entries = collectTypedSessionImageEntries([], [product]);
    expect(entries.find((e) => e.url.includes('burger'))?.kind).toBe('products');
    expect(entries.find((e) => e.url.includes('cat.png'))?.kind).toBe('categories');
    expect(entries.find((e) => e.url.includes('queso'))?.kind).toBe('modifiers');
  });

  it('dedupes session + config entries', () => {
    const config = {
      appearance: {
        coverImage: 'uploads/shared.jpg',
        pickupImage: null,
        inStoreImage: null,
      },
      organization: { logo: null },
    } as unknown as KioskConfigResponse;

    const product: MenuProduct = {
      id: 'p1',
      categoryId: 'c1',
      sectionKey: 's',
      nameKey: 'n',
      unitPrice: 1,
      image: { uri: 'https://midazqa.dis-global.com/uploads/shared.jpg' },
    };

    const entries = collectTypedKioskSessionImageEntries(
      config,
      [],
      [product],
      (path) => (path ? `https://midazqa.dis-global.com/${path}` : null),
    );

    const shared = entries.filter((e) => e.url.endsWith('shared.jpg'));
    expect(shared).toHaveLength(1);
  });

  it('prioritizes modifiers before products in session collect', () => {
    const config = {
      appearance: {
        coverImage: 'uploads/cover.jpg',
        pickupImage: null,
        inStoreImage: null,
      },
      organization: { logo: null },
    } as unknown as KioskConfigResponse;

    const product: MenuProduct = {
      id: 'p1',
      categoryId: 'c1',
      sectionKey: 's',
      nameKey: 'n',
      unitPrice: 1,
      image: { uri: 'https://midazqa.dis-global.com/uploads/burger.jpg' },
      modifierGroups: [
        {
          id: 'g1',
          name: 'Extras',
          isRequired: false,
          minSelection: 0,
          maxSelection: 2,
          quotaFree: 0,
          quotaFreeBySize: null,
          excessPrice: 0,
          sortOrder: 0,
          options: [
            {
              id: 'o1',
              name: 'Queso',
              additionalPrice: 1,
              sortOrder: 0,
              imageUrl: 'uploads/queso.png',
            },
          ],
        },
      ],
    };

    const entries = collectTypedKioskSessionImageEntries(
      config,
      [],
      [product],
      (path) => (path ? `https://midazqa.dis-global.com/${path}` : null),
    );

    const kinds = entries.map((e) => e.kind);
    expect(kinds.indexOf('config')).toBeLessThan(kinds.indexOf('modifiers'));
    expect(kinds.indexOf('modifiers')).toBeLessThan(kinds.indexOf('products'));
  });
});
