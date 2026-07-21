import { resolveOrderingLayerVisibility } from '../orderingLayers';
import { sortImageSyncEntriesByPriority } from '@shared/images/prefetchKioskImages';

describe('resolveOrderingLayerVisibility', () => {
  it('keeps menu parked (not unmounted) on cart', () => {
    const layers = resolveOrderingLayerVisibility({
      routeName: 'cart',
      detailProductId: 'p1',
      modifiersSessionProductId: 'p1',
    });
    expect(layers.menu).toBe('parked');
    expect(layers.cart).toBe('active');
    expect(layers.detail).toBe('parked');
    expect(layers.modifiers).toBe('parked');
  });

  it('activates modifiers and parks detail during wizard', () => {
    const layers = resolveOrderingLayerVisibility({
      routeName: 'modifiers',
      detailProductId: 'p1',
      modifiersSessionProductId: 'p1',
    });
    expect(layers.menu).toBe('parked');
    expect(layers.modifiers).toBe('active');
    expect(layers.detail).toBe('parked');
    expect(layers.cart).toBe('unmounted');
  });

  it('shows only menu on menu route and unmounts sessions', () => {
    const layers = resolveOrderingLayerVisibility({
      routeName: 'menu',
      detailProductId: null,
      modifiersSessionProductId: null,
    });
    expect(layers.menu).toBe('active');
    expect(layers.detail).toBe('unmounted');
    expect(layers.modifiers).toBe('unmounted');
    expect(layers.cart).toBe('unmounted');
  });

  it('activates detail and parks modifiers after back from wizard', () => {
    const layers = resolveOrderingLayerVisibility({
      routeName: 'product-detail',
      detailProductId: 'p1',
      modifiersSessionProductId: 'p1',
    });
    expect(layers.detail).toBe('active');
    expect(layers.modifiers).toBe('parked');
  });
});

describe('sortImageSyncEntriesByPriority', () => {
  it('orders config, modifiers, categories, products', () => {
    const sorted = sortImageSyncEntriesByPriority([
      { url: 'p', kind: 'products' as const },
      { url: 'm', kind: 'modifiers' as const },
      { url: 'c', kind: 'config' as const },
      { url: 'cat', kind: 'categories' as const },
    ]);
    expect(sorted.map((e) => e.kind)).toEqual([
      'config',
      'modifiers',
      'categories',
      'products',
    ]);
  });
});
