import {
  mockMenuCategories,
  mockMenuProducts,
} from '@modules/ordering/menu/data/mockMenuCatalog';

import { setCatalog } from '@shared/catalog/catalogStore';

import {
  buildCategoriesFromProducts,
  mapApiProductToMenuProduct,
  mapMenuProductToApiProduct,
} from '../mappers/product';
import type { KioskConfigResponse, KioskProductApi } from '../types';
import { mockPagoMovilAccount } from './mockPagoMovilAccount';

const productIdToNumeric = new Map<string, number>();

mockMenuProducts.forEach((product, index) => {
  productIdToNumeric.set(product.id, index + 1);
});

/** Preserves kiosk UI fields that API mapping does not carry (modifiers, featured, etc.). */
function mergeMenuProductWithMockSource(
  mapped: ReturnType<typeof mapApiProductToMenuProduct>,
  mock: (typeof mockMenuProducts)[number],
) {
  return {
    ...mapped,
    nameKey: mock.nameKey,
    descriptionKey: mock.descriptionKey,
    sectionKey: mock.sectionKey,
    featured: mock.featured,
    highlighted: mock.highlighted,
    badge: mock.badge,
    hasModifiers: mock.hasModifiers,
    modifierFlowId: mock.modifierFlowId,
    detailImage: mock.detailImage,
    image: mock.image,
    unitPrice: mock.unitPrice,
    unitPriceVes: mock.unitPriceVes,
    displayName: mock.displayName,
    displayDescription: mock.displayDescription,
    sku: mock.sku,
    barcode: mock.barcode,
  };
}

export function syncMockCatalogFromMenuMocks(): void {
  const apiProducts: KioskProductApi[] = mockMenuProducts.map((product) =>
    mapMenuProductToApiProduct(product, productIdToNumeric.get(product.id)!),
  );

  const menuProducts = mockMenuProducts.map((mock, index) => {
    const api = apiProducts[index]!;
    const mapped = mapApiProductToMenuProduct(api, mock.id, mock.image);
    return mergeMenuProductWithMockSource(mapped, mock);
  });

  const categories =
    mockMenuCategories.length > 0
      ? mockMenuCategories
      : buildCategoriesFromProducts(menuProducts);

  setCatalog(categories, menuProducts, productIdToNumeric);
}

export function getMockConfig(): KioskConfigResponse {
  return {
    id: 'mock-config-id',
    kioskDeviceId: 'mock-device-id',
    // null = par de fábrica, que es lo que Storybook y los mocks venían mostrando.
    orderTypes: null,
    kioskInvoicingType: null,
    foodServiceEnabled: true,
    tableFieldEnabled: false,
    printQrEnabled: false,
    comandaModel: 'printed',
    enabledPaymentMethods: ['debito', 'pago_movil', 'efectivo_ves'],
    appearance: {
      primaryColor: '#004be0',
      secondaryColor: '#07143a',
      title: 'Bienvenidos',
      subtitle: 'Realizá tu pedido aquí',
      coverImage: null,
      pickupImage: null,
      inStoreImage: null,
      titleColor: null,
      subtitleColor: null,
      languages: ['es', 'en'],
      translations: {
        en: { title: 'Welcome', subtitle: 'Place your order here' },
      },
    },
    organization: {
      name: 'Midaz Demo',
      legalName: 'Midaz Demo C.A.',
      rif: 'J-00000000-0',
      logo: null,
      primaryCurrency: 'USD',
      invoicingType: 'fiscal_machine',
    },
    pagoMovilAccount: mockPagoMovilAccount,
    exchangeRates: {
      usd: 36.5,
      eur: 40,
      date: '2026-01-01',
    },
  };
}

export function getMockApiProducts(): KioskProductApi[] {
  return mockMenuProducts.map((product) =>
    mapMenuProductToApiProduct(product, productIdToNumeric.get(product.id)!),
  );
}
