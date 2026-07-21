import type { KioskAppearanceState } from '@shared/session/kioskBootstrapState';

import { brand } from './brand';
import { kioskScreenColors } from './kioskScreen';

export type KioskScreenThemeColors = {
  [K in keyof typeof kioskScreenColors]: string;
};

export function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) {
    return hex;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return hex;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Maps kiosk config appearance colors onto kiosk UI tokens. */
export function buildKioskScreenColors(
  appearance: Pick<KioskAppearanceState, 'primaryColor' | 'secondaryColor'> | null,
): KioskScreenThemeColors {
  const primary = appearance?.primaryColor ?? brand.blue;
  const secondary = appearance?.secondaryColor ?? brand.navy;
  const menuSectionMuted = colorWithAlpha(secondary, 0.55);

  return {
    ...kioskScreenColors,
    title: secondary,
    subtitle: menuSectionMuted,
    menuSectionHeading: secondary,
    menuSectionMuted,
    priceAccent: primary,
    categorySelectedBg: colorWithAlpha(primary, 0.14),
    categorySelectedBorder: primary,
    searchBorderDefault: colorWithAlpha(secondary, 0.35),
    searchBorderFocusOrange: primary,
    searchBorderFocusBlue: primary,
    productDetailBorder: colorWithAlpha(secondary, 0.14),
    cartAddMoreBorder: colorWithAlpha(secondary, 0.45),
    cartCheckoutTotalLabel: secondary,
    highlightRing: primary,
    addButtonMuted: colorWithAlpha(primary, 0.12),
    cartBar: primary,
    cartBadge: secondary,
    modifierSelectedBg: colorWithAlpha(primary, 0.1),
    modifierChipBorder: colorWithAlpha(primary, 0.28),
    modifierPriceFree: kioskScreenColors.modifierPriceFree,
    cartCheckoutBcvBannerBg: colorWithAlpha(primary, 0.1),
    cartCheckoutBcvBannerBorder: colorWithAlpha(primary, 0.2),
    cartCheckoutBcvLabel: colorWithAlpha(primary, 0.8),
    cartCheckoutBcvRate: primary,
    cartCheckoutTotalValue: primary,
    paymentMethodIconBg: colorWithAlpha(primary, 0.08),
    paymentMethodIconBorder: colorWithAlpha(secondary, 0.1),
    paymentMethodCardBorder: colorWithAlpha(secondary, 0.05),
    paymentMethodSubtitle: colorWithAlpha(secondary, 0.4),
    paymentMethodRadioBorder: colorWithAlpha(secondary, 0.2),
    paymentMethodRadioSelected: primary,
    paymentPosHeroIconBorder: colorWithAlpha(secondary, 0.1),
    paymentReferenceMuted: menuSectionMuted,
    paymentReferenceInputBorder: colorWithAlpha(secondary, 0.2),
    paymentReferenceKeypadKeyBorder: colorWithAlpha(secondary, 0.15),
    paymentOutcomeOrderCardBg: colorWithAlpha(primary, 0.12),
    paymentOutcomeOrderCardBorder: colorWithAlpha(primary, 0.22),
    paymentOutcomeAccent: primary,
    paymentOutcomeQrPaymentStatus: primary,
  } satisfies KioskScreenThemeColors;
}
