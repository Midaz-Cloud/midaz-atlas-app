import ReactTestRenderer, { act } from 'react-test-renderer';

import { KioskOrderProvider } from '@shared/kiosk-order';
import type { MenuProduct } from '../menu/types';

const capturedProps: { onAddProduct?: (product: MenuProduct) => void }[] = [];

jest.mock('../menu/MenuScreen', () => ({
  MenuScreen: (props: { onAddProduct: (product: MenuProduct) => void }) => {
    capturedProps.push(props);
    return null;
  },
}));

// eslint-disable-next-line import/first
import { OrderingNavigator } from '../OrderingNavigator';

const sampleProduct: MenuProduct = {
  id: 'p1',
  nameKey: 'product.p1',
  sectionKey: 'section.p1',
  categoryId: 'c1',
  unitPrice: 1.5,
  image: { uri: 'https://example.com/a.png' },
} as MenuProduct;

describe('OrderingNavigator stable callbacks', () => {
  beforeEach(() => {
    capturedProps.length = 0;
  });

  it('keeps handleAddProduct identity stable across cart mutations', async () => {
    // El primer render de este árbol compila muchas dependencias de golpe
    // (menú, modificadores, carrito) — el timeout default de 5s a veces no
    // alcanza en frío.
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <KioskOrderProvider>
          <OrderingNavigator onProceedToPayment={jest.fn()} />
        </KioskOrderProvider>,
      );
    });

    expect(capturedProps.length).toBeGreaterThan(0);
    const firstOnAddProduct = capturedProps[capturedProps.length - 1].onAddProduct;
    expect(typeof firstOnAddProduct).toBe('function');

    // Adding a product bumps `itemCount` in the real cart provider — this used
    // to recreate `handleAddProduct` (deps included the raw `itemCount`),
    // which broke the Fase 2 `React.memo` on MenuScreen/ProductCard.
    await act(async () => {
      firstOnAddProduct!(sampleProduct);
    });

    expect(capturedProps.length).toBeGreaterThan(1);
    const secondOnAddProduct = capturedProps[capturedProps.length - 1].onAddProduct;
    expect(secondOnAddProduct).toBe(firstOnAddProduct);

    await act(async () => {
      renderer.unmount();
    });
  }, 15000);
});
