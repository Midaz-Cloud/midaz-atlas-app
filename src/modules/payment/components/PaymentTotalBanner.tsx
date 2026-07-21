import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { formatVesPrice } from '@shared/utils';

export type PaymentTotalBannerProps = {
  label: string;
  totalVes: number;
  testID?: string;
};

export function PaymentTotalBanner({
  label,
  totalVes,
  testID = 'payment-total-banner',
}: PaymentTotalBannerProps) {
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
          borderRadius: kioskScreenLayout.cartCheckoutBcvBannerRadius,
          borderWidth: kioskScreenLayout.cartCheckoutBcvBannerBorderWidth,
          borderColor: colors.cartCheckoutBcvBannerBorder,
          paddingVertical: kioskScreenLayout.cartCheckoutBcvBannerPaddingVertical,
          paddingHorizontal: kioskScreenLayout.cartCheckoutBcvBannerPaddingHorizontal,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartCheckoutBcvLabelSize,
          lineHeight: kioskScreenLayout.cartCheckoutBcvLabelLineHeight,
          color: colors.cartCheckoutBcvLabel,
        },
        value: {
          ...displayTextStyle({ fontWeight: '800' }),
          fontSize: kioskScreenLayout.cartCheckoutBcvRateSize,
          lineHeight: kioskScreenLayout.cartCheckoutBcvRateLineHeight,
          color: colors.cartCheckoutBcvRate,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.banner} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatVesPrice(totalVes)}</Text>
    </View>
  );
}
