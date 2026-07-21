import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export function CartHeader() {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'flex-start',
          gap: kioskScreenLayout.modifiersHeaderGap,
          paddingHorizontal: kioskScreenLayout.cartHeaderPaddingHorizontal,
          paddingVertical: kioskScreenLayout.modifiersHeaderGap,
        },
        title: {
          ...displayTextStyle(),
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.cartTitleSize,
          lineHeight: kioskScreenLayout.cartTitleLineHeight,
          color: colors.title,
          textAlign: 'left',
        },
        subtitle: {
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.cartSubtitleSize,
          lineHeight: kioskScreenLayout.cartSubtitleLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'left',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} testID="cart-header">
      <Text style={styles.title}>{t('cart.title')}</Text>
      <Text style={styles.subtitle}>{t('cart.subtitle')}</Text>
    </View>
  );
}
