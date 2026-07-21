import { getCatalogProducts } from '@shared/catalog/catalogStore';

import { syncMockCatalogFromMenuMocks } from '../buildMockFixtures';

describe('syncMockCatalogFromMenuMocks', () => {
  beforeEach(() => {
    syncMockCatalogFromMenuMocks();
  });

  it('includes yogurt with featured and modifier flow in catalog', () => {
    const yogurt = getCatalogProducts().find((p) => p.id === 'yogurt-custom');
    expect(yogurt).toBeDefined();
    expect(yogurt?.featured).toBe(true);
    expect(yogurt?.hasModifiers).toBe(true);
    expect(yogurt?.modifierFlowId).toBe('yogurt-flow');
  });

  it('preserves cup-large modifier flow', () => {
    const cupLarge = getCatalogProducts().find((p) => p.id === 'cup-large');
    expect(cupLarge?.modifierFlowId).toBe('cup-large-flow');
    expect(cupLarge?.hasModifiers).toBe(true);
  });
});
