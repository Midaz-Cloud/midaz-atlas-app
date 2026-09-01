import liveConfigFixture from '../../fixtures/live/config.response.json';
import liveProductsFixture from '../../fixtures/live/products.response.json';
import {
  mapLiveConfigToKioskConfigResponse,
  normalizeEnabledPaymentMethods,
} from '../liveConfig';
import {
  mapLiveProductToKioskProductApi,
  mapLiveProductToMenuProduct,
  parseKioskProductsResponse,
} from '../liveProduct';
import type { KioskConfigResponseLive, KioskProductApiLive } from '../../liveApi.types';
import { computeOrderTotals } from '@shared/kiosk-order/computeOrderTotals';

describe('live config mappers', () => {
  it('maps live config fixture to KioskConfigResponse', () => {
    const config = mapLiveConfigToKioskConfigResponse(
      liveConfigFixture as KioskConfigResponseLive,
    );
    expect(config.appearance.title).toBe('');
    expect(config.organization.name).toBe('The Factory HKA');
    expect(config.organization.primaryCurrency).toBe('VES');
    expect(config.exchangeRates?.usd).toBe(639.7029);
    expect(config.enabledPaymentMethods).toEqual(['debito', 'pago_movil', 'efectivo_ves']);
    expect(config.pagoMovilAccount).toBeNull();
  });

  it('maps pagoMovilAccount when present in live config', () => {
    const live = {
      ...(liveConfigFixture as KioskConfigResponseLive),
      pagoMovilAccount: {
        bank: 'Banco Activo',
        bankCode: '0171',
        phone: '04142251008',
        cedula: 'J412438905',
        holder: 'COCHI CRUNCH C.A.',
      },
    };
    const config = mapLiveConfigToKioskConfigResponse(live);
    expect(config.pagoMovilAccount).toEqual({
      bank: 'Banco Activo',
      bankCode: '0171',
      phone: '04142251008',
      cedula: 'J412438905',
      holder: 'COCHI CRUNCH C.A.',
    });
  });

  it('filters unknown payment methods', () => {
    expect(normalizeEnabledPaymentMethods(['debito', 'unknown', 'pago_movil'])).toEqual([
      'debito',
      'pago_movil',
    ]);
  });

  it('keeps efectivo_ves from live QA config', () => {
    expect(
      normalizeEnabledPaymentMethods(['debito', 'pago_movil', 'efectivo_ves']),
    ).toEqual(['debito', 'pago_movil', 'efectivo_ves']);
  });

  it('maps printQrEnabled from live config fixture shape', () => {
    const config = mapLiveConfigToKioskConfigResponse({
      ...(liveConfigFixture as KioskConfigResponseLive),
      printQrEnabled: true,
    });
    expect(config.printQrEnabled).toBe(true);
  });

  it('maps organization invoicingType and kioskInvoicingType', () => {
    const config = mapLiveConfigToKioskConfigResponse({
      ...(liveConfigFixture as KioskConfigResponseLive),
      kioskInvoicingType: null,
      organization: {
        ...(liveConfigFixture as KioskConfigResponseLive).organization,
        invoicingType: 'fiscal_machine',
      },
    });
    expect(config.organization.invoicingType).toBe('fiscal_machine');
    expect(config.kioskInvoicingType).toBeNull();
  });
});

describe('live product mappers', () => {
  const firstProduct = (liveProductsFixture as unknown as KioskProductApiLive[])[0];

  it('maps live product price string without inventing priceVES', () => {
    const api = mapLiveProductToKioskProductApi(firstProduct, 'USD');
    expect(api.price).toBe(1);
    expect(api.priceVES).toBeUndefined();
    expect(api.category).toBe('Alimentos');
    expect(api.taxRate).toBe(0);
    expect(api.isExempt).toBe(true);
  });

  it('uses API priceVES when provided', () => {
    const withVes = { ...firstProduct, priceVES: 73 };
    const api = mapLiveProductToKioskProductApi(withVes, 'USD');
    expect(api.priceVES).toBe(73);
  });

  it('maps live product to menu product', () => {
    const menu = mapLiveProductToMenuProduct(firstProduct, String(firstProduct.id), 'USD');
    expect(menu.displayName).toBe('Magnesio glicinato 60 caps');
    expect(menu.unitPrice).toBe(1);
    expect(menu.unitPriceVes).toBeUndefined();
    expect(menu.categoryDisplayName).toBe('Alimentos');
    expect(menu.categoryId).toBe('a');
  });

  it('maps modifierGroups when present in fixture', () => {
    const withMods = (liveProductsFixture as unknown as KioskProductApiLive[]).find((p) => (p.modifierGroups?.length ?? 0) > 0)!;
    const menu = mapLiveProductToMenuProduct(withMods, String(withMods.id), 'USD');
    expect(menu.hasModifiers).toBe(true);
    expect(menu.modifierGroups?.[0]?.options.length).toBeGreaterThan(0);
  });

  it('parses root array products response', () => {
    const parsed = parseKioskProductsResponse(liveProductsFixture, 'USD');
    expect(parsed.data.length).toBeGreaterThan(0);
    expect(parsed.data[0].category).toBe('Alimentos');
    expect(parsed.data[0].price).toBe(1);
    expect(parsed.data[0].priceVES).toBeUndefined();
  });

  it('preserves category.image as categoryImage when present', () => {
    const withCategoryImage = {
      ...(liveProductsFixture as unknown as KioskProductApiLive[])[0],
      category: {
        ...(liveProductsFixture as unknown as KioskProductApiLive[])[0].category,
        image: 'uploads/cat-bebidas.png',
      },
    };
    const parsed = parseKioskProductsResponse([withCategoryImage], 'USD');
    expect(parsed.data[0].categoryImage).toBe('uploads/cat-bebidas.png');
  });
});

describe('computeOrderTotals with unitPriceVes', () => {
  it('sums Bs from line unitPriceVes without FX conversion', () => {
    const totals = computeOrderTotals(
      [
        {
          lineId: '1',
          productId: 'p1',
          quantity: 2,
          unitPrice: 2,
          unitPriceVes: 73,
          taxRate: 16,
          isExempt: false,
        },
      ],
      { vatRate: 0, igtfRate: 0, usdToVesRate: 99 },
      { usePerLineTax: true, declaresTaxes: true },
    );
    expect(totals.subtotalUsd).toBe(4);
    expect(totals.taxUsd).toBe(0.64);
    expect(totals.subtotalVes).toBe(146);
    expect(totals.taxVes).toBe(23.36);
    expect(totals.totalVes).toBe(169.36);
  });
});
