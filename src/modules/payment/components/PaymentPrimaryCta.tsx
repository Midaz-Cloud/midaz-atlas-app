import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconCtaChevron from '@assets/images/payment/pos/icon-cta-chevron.svg';

export type PaymentPrimaryCtaProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  showChevron?: boolean;
};

export function PaymentPrimaryCta({
  label,
  disabled = false,
  onPress,
  testID = 'payment-flow-continue',
  showChevron = true,
}: PaymentPrimaryCtaProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cta: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
          gap: kioskScreenLayout.productDetailSectionGap,
          backgroundColor: colors.priceAccent,
          borderRadius: kioskScreenLayout.productDetailCtaRadius,
          paddingVertical: kioskScreenLayout.productDetailCtaPaddingVertical,
          ...kioskScreenShadows.menuCard,
        },
        ctaDisabled: {
          opacity: 0.45,
        },
        pressed: {
          opacity: 0.9,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCtaFontSize,
          lineHeight: kioskScreenLayout.productDetailCtaLineHeight,
          color: colors.cartIcon,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        disabled && styles.ctaDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      testID={testID}>
      <Text style={styles.label}>{label}</Text>
      {showChevron ? (
        <IconCtaChevron
          width={kioskScreenLayout.productDetailCtaIconWidth}
          height={kioskScreenLayout.productDetailCtaIconHeight}
          color={colors.cartIcon}
        />
      ) : null}
    </Pressable>
  );
}
