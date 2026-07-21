import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { formatBcvRate } from '@shared/utils';
import { retailScanLayout } from '@modules/ordering/retail/retailScanLayout';

export type CartCheckoutBcvBannerProps = {
  /** Bs per unit of org primary currency (from config `exchangeRates`). */
  bcvRate: number;
  compact?: boolean;
};

export function CartCheckoutBcvBanner({ bcvRate, compact = false }: CartCheckoutBcvBannerProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          alignSelf: 'stretch',
          backgroundColor: colors.cartCheckoutBcvBannerBg,
          borderRadius: compact
            ? retailScanLayout.bcvBannerRadius
            : kioskScreenLayout.cartCheckoutBcvBannerRadius,
          borderWidth: compact
            ? retailScanLayout.promptBorderWidth
            : kioskScreenLayout.cartCheckoutBcvBannerBorderWidth,
          borderColor: colors.cartCheckoutBcvBannerBorder,
          paddingVertical: compact
            ? retailScanLayout.bcvBannerPaddingV
            : kioskScreenLayout.cartCheckoutBcvBannerPaddingVertical,
          paddingHorizontal: compact
            ? retailScanLayout.bcvBannerPaddingH
            : kioskScreenLayout.cartCheckoutBcvBannerPaddingHorizontal,
        },
        label: {
          ...displayTextStyle(),
          fontSize: compact
            ? retailScanLayout.bcvLabelSize
            : kioskScreenLayout.cartCheckoutBcvLabelSize,
          lineHeight: compact
            ? retailScanLayout.bcvLabelSize + 4
            : kioskScreenLayout.cartCheckoutBcvLabelLineHeight,
          color: colors.cartCheckoutBcvLabel,
        },
        rateValue: {
          ...displayTextStyle({ fontWeight: '800' }),
          fontSize: compact
            ? retailScanLayout.bcvRateSize
            : kioskScreenLayout.cartCheckoutBcvRateSize,
          lineHeight: compact
            ? retailScanLayout.bcvRateSize + 6
            : kioskScreenLayout.cartCheckoutBcvRateLineHeight,
          color: colors.cartCheckoutBcvRate,
        },
      }),
    [colors, compact],
  );

  return (
    <View style={styles.banner} testID="cart-checkout-bcv-banner">
      <Text style={styles.label}>{t('cart.checkout.bcvRateLabel')}</Text>
      <Text style={styles.rateValue}>{formatBcvRate(bcvRate)}</Text>
    </View>
  );
}
