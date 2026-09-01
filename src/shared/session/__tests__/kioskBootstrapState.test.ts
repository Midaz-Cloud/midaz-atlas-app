import liveConfigFixture from '@shared/api/kiosk/fixtures/live/config.response.json';
import { mapLiveConfigToKioskConfigResponse } from '@shared/api/kiosk/mappers/liveConfig';
import type { KioskConfigResponseLive } from '@shared/api/kiosk/liveApi.types';

import { buildBootstrapSnapshot } from '../kioskBootstrapState';

jest.mock('@shared/config/api', () => ({
  getKioskUploadsBaseUrl: () => 'http://test/uploads',
  getKioskApiUrl: (path: string) => `http://test${path}`,
}));

describe('buildBootstrapSnapshot', () => {
  it('resolves appearance and organization image URLs', () => {
    const baseConfig = mapLiveConfigToKioskConfigResponse(
      liveConfigFixture as KioskConfigResponseLive,
    );
    const config = {
      ...baseConfig,
      appearance: {
        ...baseConfig.appearance,
        title: 'Bienvenido',
        coverImage: 'uploads/1779660683562-947537372.jpg',
        titleColor: '#FFF1E1',
        languages: ['es', 'en'],
      },
      organization: {
        ...baseConfig.organization,
        name: 'Cochi Crunch',
        logo: 'uploads/1779638366098-305832616.png',
        primaryCurrency: 'USD',
      },
      exchangeRates: { usd: 36.5, eur: 40.0, date: '2026-05-24' },
      enabledPaymentMethods: ['debito' as const],
    };
    const snapshot = buildBootstrapSnapshot(config, 'AF910S202550915004', 38, '"etag-1"');

    expect(snapshot.deviceSerial).toBe('AF910S202550915004');
    expect(snapshot.productCount).toBe(38);
    expect(snapshot.configEtag).toBe('"etag-1"');
    expect(snapshot.appearance.title).toBe('Bienvenido');
    expect(snapshot.appearance.coverImageUrl).toContain('uploads/1779660683562');
    expect(snapshot.organization.name).toBe('Cochi Crunch');
    expect(snapshot.organization.logoUrl).toContain('uploads/1779638366098');
    expect(snapshot.operational.enabledPaymentMethods).toEqual(['debito']);
    expect(snapshot.operational.orderTypeSelectionEnabled).toBe(false);
    expect(snapshot.operational.languageSwitcherEnabled).toBe(true);
    expect(snapshot.operational.defaultLocale).toBe('es');
    expect(snapshot.operational.enabledLocales).toEqual(['es', 'en']);
    expect(snapshot.appearance.titleColor).toBe('#FFF1E1');
    expect(snapshot.appearance.languages).toEqual(['es', 'en']);
    expect(snapshot.pricing.primaryCurrency).toBe('USD');
    expect(snapshot.pricing.exchangeRates?.usd).toBe(36.5);
    expect(snapshot.pricing.usePerLineTax).toBe(true);
  });

  it('resolves effectiveInvoicingType preferring kiosk override', () => {
    const config = mapLiveConfigToKioskConfigResponse({
      ...(liveConfigFixture as KioskConfigResponseLive),
      kioskInvoicingType: 'fiscal_machine',
      organization: {
        ...(liveConfigFixture as KioskConfigResponseLive).organization,
        invoicingType: 'digital_invoicing',
      },
    });
    const snapshot = buildBootstrapSnapshot(config, 'SN-1', 1);

    expect(snapshot.organization.invoicingType).toBe('digital_invoicing');
    expect(snapshot.organization.kioskInvoicingType).toBe('fiscal_machine');
    expect(snapshot.organization.effectiveInvoicingType).toBe('fiscal_machine');
  });
});
