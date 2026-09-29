import ReactTestRenderer, { act } from 'react-test-renderer';
import { View } from 'react-native';

import type { MenuCategory, MenuProduct } from '../types';

const mockRenderedCards: string[] = [];
let mockCapturedTabs: { onSelectCategory: (id: string) => void } | null = null;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@shared/kiosk-order', () => ({
  useKioskOrder: () => ({ lines: [] }),
}));

jest.mock('@shared/config/api', () => ({
  shouldUseMockApi: () => false,
}));

const product = (id: string, categoryId: string, featured = false): MenuProduct =>
  ({
    id,
    nameKey: `product.${id}`,
    sectionKey: `section.${categoryId}`,
    categoryId,
    unitPrice: 2,
    featured,
    image: { uri: `https://example.com/${id}.png` },
  }) as MenuProduct;

const mockCategories: MenuCategory[] = [
  { id: 'c1', nameKey: 'cat.c1' } as MenuCategory,
  { id: 'c2', nameKey: 'cat.c2' } as MenuCategory,
];
const mockProducts: MenuProduct[] = [
  product('a1', 'c1'),
  product('a2', 'c1'),
  product('a3', 'c1'),
  product('b1', 'c2'),
  product('b2', 'c2'),
];

jest.mock('@shared/catalog/catalogStore', () => ({
  getCatalogCategories: () => mockCategories,
  getCatalogProducts: () => mockProducts,
}));

jest.mock('../components', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    MenuSearchHeader: () => null,
    MenuCartBar: () => null,
    MenuFeaturedSection: () => null,
    MenuCategoryTabs: (props: { onSelectCategory: (id: string) => void }) => {
      mockCapturedTabs = props;
      return null;
    },
    MenuProductRow: ({ row }: { row: MenuProduct[] }) => {
      row.forEach((item) => mockRenderedCards.push(item.id));
      return React.createElement(
        RNView,
        null,
        row.map((item) => React.createElement(RNView, { key: item.id, testID: `product-card-${item.id}` })),
      );
    },
  };
});

import { MenuScreen, chunkProductsIntoRows } from '../MenuScreen';

function mountedCardIds(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll((node) => node.type === View && String(node.props.testID ?? '').startsWith('product-card-'))
    .map((node) => String(node.props.testID).replace('product-card-', ''))
    .sort();
}

describe('MenuScreen (Fase 2 · una categoría montada, lista virtualizada)', () => {
  beforeEach(() => {
    mockRenderedCards.length = 0;
    mockCapturedTabs = null;
  });

  it('chunks products into rows of two', () => {
    expect(chunkProductsIntoRows(mockProducts.slice(0, 3)).map((row) => row.map((p) => p.id))).toEqual([
      ['a1', 'a2'],
      ['a3'],
    ]);
    expect(chunkProductsIntoRows([])).toEqual([]);
  });

  it('mounts only the selected category and swaps it when the tab changes', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MenuScreen
          itemCount={0}
          totalUsd={0}
          onBack={jest.fn()}
          onProductPress={jest.fn()}
          onAddProduct={jest.fn()}
          onCartPress={jest.fn()}
          onCartNext={jest.fn()}
        />,
      );
    });

    // Primera categoría: sus 3 productos y NINGUNO de la segunda.
    expect(mountedCardIds(renderer)).toEqual(['a1', 'a2', 'a3']);
    expect(renderer.root.findByProps({ testID: 'menu-category-panel-c1' })).toBeTruthy();

    await act(async () => {
      mockCapturedTabs!.onSelectCategory('c2');
    });

    expect(mountedCardIds(renderer)).toEqual(['b1', 'b2']);
    expect(renderer.root.findByProps({ testID: 'menu-category-panel-c2' })).toBeTruthy();
    // Las tarjetas de c1 se desmontaron (no quedan ocultas con display:none).
    expect(renderer.root.findAllByProps({ testID: 'product-card-a1' })).toHaveLength(0);

    await act(async () => {
      renderer.unmount();
    });
  });
});
