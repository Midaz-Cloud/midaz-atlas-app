import liveProductsFixture from '../../fixtures/live/products.response.json';
import { mapLiveModifierGroups } from '../modifierGroups';
import { mapLiveProductToMenuProduct } from '../liveProduct';
import type { KioskProductApiLive } from '../../liveApi.types';

describe('modifierGroups mapping', () => {
  const withModifiers = (liveProductsFixture as KioskProductApiLive[]).find(
    (p) => p.id === 62,
  )!;

  it('maps modifierGroups onto MenuProduct', () => {
    const menu = mapLiveProductToMenuProduct(withModifiers, '62', 'USD');
    expect(menu.hasModifiers).toBe(true);
    expect(menu.modifierGroups).toHaveLength(1);
    expect(menu.modifierGroups![0].name).toBe('Agregados');
    expect(menu.modifierGroups![0].options).toHaveLength(2);
    expect(menu.modifierGroups![0].quotaFree).toBe(1);
  });

  it('preserves option imageUrl when present in API payload', () => {
    const groups = mapLiveModifierGroups([
      {
        id: 'grp-test',
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
            id: 'opt-img',
            name: 'Queso',
            additionalPrice: 1,
            sortOrder: 0,
            imageUrl: 'uploads/modifiers/queso.png',
          },
        ],
      },
    ]);
    expect(groups[0]?.options[0]?.imageUrl).toBe('uploads/modifiers/queso.png');
  });

  it('maps imgUrl from API and prefers it over imageUrl/image', () => {
    const groups = mapLiveModifierGroups([
      {
        id: 'grp-img',
        name: 'Extras',
        isRequired: false,
        minSelection: 0,
        maxSelection: 1,
        quotaFree: 0,
        quotaFreeBySize: null,
        excessPrice: 0,
        sortOrder: 0,
        options: [
          {
            id: 'opt-new',
            name: 'Oreo',
            additionalPrice: 0,
            sortOrder: 0,
            imgUrl: 'uploads/modifiers/oreo.png',
            imageUrl: 'uploads/modifiers/legacy.png',
            image: 'uploads/modifiers/old.png',
          },
        ],
      },
    ]);
    expect(groups[0]?.options[0]?.imageUrl).toBe('uploads/modifiers/oreo.png');
  });
});
