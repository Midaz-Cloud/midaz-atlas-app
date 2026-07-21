import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, useKioskScreenColors } from '@shared/theme';

import IconPayCard from '@assets/images/payment/pos/icon-card.svg';
import IconCtaChevron from '@assets/images/ordering/product-detail/icon-cta-chevron.svg';

import { retailScanLayout } from '../retailScanLayout';

export type ScanCartPayButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function ScanCartPayButton({ onPress, disabled = false }: ScanCartPayButtonProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: retailScanLayout.payButtonGap,
          backgroundColor: colors.priceAccent,
          borderRadius: retailScanLayout.payButtonRadius,
          paddingVertical: retailScanLayout.payButtonPaddingVertical,
          paddingHorizontal: retailScanLayout.payButtonPaddingHorizontal,
        },
        buttonDisabled: {
          opacity: 0.45,
        },
        pressed: {
          opacity: 0.9,
        },
        cardIconBox: {
          width: retailScanLayout.payButtonIconBoxSize,
          height: retailScanLayout.payButtonIconBoxSize,
          borderRadius: retailScanLayout.payButtonIconBoxRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        label: {
          ...displayTextStyle(),
          flex: 1,
          fontSize: retailScanLayout.payButtonFontSize,
          lineHeight: retailScanLayout.payButtonLineHeight,
          color: colors.cartIcon,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('scanCart.checkout.pay')}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      testID="scan-cart-pay">
      <View style={styles.cardIconBox}>
        <IconPayCard
          width={retailScanLayout.payButtonCardIconWidth}
          height={retailScanLayout.payButtonCardIconHeight}
          color={colors.cartIcon}
        />
      </View>
      <Text style={styles.label}>{t('scanCart.checkout.pay')}</Text>
      <IconCtaChevron
        width={retailScanLayout.payButtonArrowWidth}
        height={retailScanLayout.payButtonArrowHeight}
        color={colors.cartIcon}
      />
    </Pressable>
  );
}
