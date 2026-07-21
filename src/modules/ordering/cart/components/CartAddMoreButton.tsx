import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconAddMore from '@assets/images/ordering/cart/icon-add-more.svg';

export type CartAddMoreButtonProps = {
  onPress: () => void;
};

export function CartAddMoreButton({ onPress }: CartAddMoreButtonProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScreenLayout.modifiersBottomGap,
          borderWidth: kioskScreenLayout.cartAddMoreBorderWidth,
          borderColor: colors.cartAddMoreBorder,
          borderStyle: 'dashed',
          borderRadius: kioskScreenLayout.cartAddMoreRadius,
          paddingVertical: kioskScreenLayout.cartAddMorePaddingVertical,
          marginTop: kioskScreenLayout.modifiersHeaderGap,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartAddMoreLabelSize,
          lineHeight: kioskScreenLayout.cartAddMoreLabelLineHeight,
          color: colors.title,
        },
        pressed: {
          opacity: 0.9,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('cart.addMore')}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID="cart-add-more">
      <IconAddMore
        width={kioskScreenLayout.cartAddMoreIconWidth}
        height={kioskScreenLayout.cartAddMoreIconHeight}
        color={colors.title}
      />
      <Text style={styles.label}>{t('cart.addMore')}</Text>
    </Pressable>
  );
}

