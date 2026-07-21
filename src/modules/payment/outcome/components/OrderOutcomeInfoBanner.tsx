import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type OrderOutcomeInfoBannerProps = {
  icon: ReactNode;
  message: string;
  testID?: string;
};

/** Banner ámbar icono + texto P15 (Figma 64:23). */
export function OrderOutcomeInfoBanner({
  icon,
  message,
  testID = 'payment-outcome-info-banner',
}: OrderOutcomeInfoBannerProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
          backgroundColor: colors.cartCheckoutBcvBannerBg,
          borderRadius: kioskScreenLayout.cartCheckoutBcvBannerRadius,
          borderWidth: kioskScreenLayout.cartCheckoutBcvBannerBorderWidth,
          borderColor: colors.cartCheckoutBcvBannerBorder,
          paddingVertical: kioskScreenLayout.cartCheckoutBcvBannerPaddingVertical,
          paddingHorizontal: kioskScreenLayout.cartCheckoutBcvBannerPaddingHorizontal,
          gap: kioskScreenLayout.paymentOutcomeQrBannerInnerGap,
        },
        iconWrap: {
          width: kioskScreenLayout.paymentOutcomeQrBannerIconSize,
          height: kioskScreenLayout.paymentOutcomeQrBannerIconSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        message: {
          ...bodyTextStyle(),
          flex: 1,
          fontSize: kioskScreenLayout.paymentOutcomeQrBannerTextSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrBannerTextLineHeight,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.banner} testID={testID}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
