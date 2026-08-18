import type { PaymentMethodApi } from '@shared/api/kiosk';
import { resolveKioskImageUrl } from '@shared/api/kiosk';
import type { KioskConfigResponse, KioskAppearanceTranslation } from '@shared/api/kiosk';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { resolveEffectiveInvoicingType } from '@shared/api/kiosk/utils/invoicingType';
import { mapConfigToRuntime, type KioskRuntimeConfig } from '@shared/api/kiosk/mappers/config';
import { resolveKioskLanguagePolicy } from '@shared/i18n/resolveKioskLanguagePolicy';

export type KioskBootstrapPhase = 'login' | 'config' | 'products' | 'images';

export type KioskAppearanceState = {
  title: string;
  subtitle: string;
  coverImageUrl: string | null;
  pickupImagePath: string | null;
  inStoreImagePath: string | null;
  pickupImageUrl: string | null;
  inStoreImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  titleColor: string | null;
  subtitleColor: string | null;
  languages: string[];
  translations: Record<string, KioskAppearanceTranslation> | null;
};

export type KioskOrganizationState = {
  name: string;
  legalName: string;
  rif: string;
  logoUrl: string | null;
  declaresTaxes: boolean;
  invoicingType: string | null;
  kioskInvoicingType: string | null;
  effectiveInvoicingType: string | null;
};

export type KioskOperationalState = {
  foodServiceEnabled: boolean;
  tableFieldEnabled: boolean;
  printQrEnabled: boolean;
  comandaModel: 'printed' | 'sent';
  enabledPaymentMethods: PaymentMethodApi[];
  orderTypeSelectionEnabled: boolean;
  languageSwitcherEnabled: boolean;
  defaultLocale: 'es' | 'en';
  enabledLocales: readonly ('es' | 'en')[];
};

export type KioskExchangeRatesState = {
  usd: number;
  eur: number;
  date: string;
};

export type KioskPricingState = {
  primaryCurrency: string;
  exchangeRates: KioskExchangeRatesState | null;
  /** When true, cart totals use per-line tax from catalog (live API). */
  usePerLineTax: boolean;
};

export type KioskBootstrapSnapshot = {
  deviceSerial: string;
  productCount: number;
  configEtag: string | null;
  appearance: KioskAppearanceState;
  organization: KioskOrganizationState;
  operational: KioskOperationalState;
  pricing: KioskPricingState;
};

export function buildBootstrapSnapshot(
  config: KioskConfigResponse,
  deviceSerial: string,
  productCount: number,
  configEtag?: string | null,
): KioskBootstrapSnapshot {
  const runtime = mapConfigToRuntime(config);
  const languagePolicy = resolveKioskLanguagePolicy(config.appearance.languages);
  return {
    deviceSerial,
    productCount,
    configEtag: configEtag ?? null,
    appearance: {
      title: config.appearance.title,
      subtitle: config.appearance.subtitle,
      coverImageUrl: resolveKioskImageUrl(config.appearance.coverImage),
      pickupImagePath: config.appearance.pickupImage ?? null,
      inStoreImagePath: config.appearance.inStoreImage ?? null,
      pickupImageUrl: resolveKioskImageUrl(config.appearance.pickupImage),
      inStoreImageUrl: resolveKioskImageUrl(config.appearance.inStoreImage),
      primaryColor: config.appearance.primaryColor,
      secondaryColor: config.appearance.secondaryColor,
      titleColor: config.appearance.titleColor ?? null,
      subtitleColor: config.appearance.subtitleColor ?? null,
      languages: [...languagePolicy.enabledLocales],
      translations: config.appearance.translations ?? null,
    },
    organization: {
      name: config.organization.name,
      legalName: config.organization.legalName,
      rif: config.organization.rif,
      logoUrl: resolveKioskImageUrl(config.organization.logo),
      declaresTaxes: parseDeclaresTaxes(config.organization.declaresTaxes),
      invoicingType: config.organization.invoicingType ?? null,
      kioskInvoicingType: config.kioskInvoicingType ?? null,
      effectiveInvoicingType: resolveEffectiveInvoicingType(
        config.kioskInvoicingType,
        config.organization.invoicingType,
      ),
    },
    operational: {
      foodServiceEnabled: runtime.foodServiceEnabled,
      tableFieldEnabled: runtime.tableFieldEnabled,
      printQrEnabled: runtime.printQrEnabled,
      comandaModel: runtime.comandaModel,
      enabledPaymentMethods: runtime.enabledPaymentMethods,
      orderTypeSelectionEnabled: runtime.orderTypeSelectionEnabled,
      languageSwitcherEnabled: languagePolicy.languageSwitcherEnabled,
      defaultLocale: languagePolicy.defaultLocale,
      enabledLocales: languagePolicy.enabledLocales,
    },
    pricing: {
      primaryCurrency: config.organization.primaryCurrency ?? 'USD',
      exchangeRates: config.exchangeRates,
      usePerLineTax: true,
    },
  };
}

export function runtimeConfigFromSnapshot(
  config: KioskConfigResponse,
): KioskRuntimeConfig {
  return mapConfigToRuntime(config);
}
