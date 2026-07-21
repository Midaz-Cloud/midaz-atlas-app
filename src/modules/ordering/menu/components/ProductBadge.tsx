import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import type { ProductBadge as ProductBadgeType } from '../types';

type ProductBadgeProps = {
  badge: ProductBadgeType;
  variant?: 'corner' | 'ribbon';
};

export function ProductBadge({ badge, variant = 'corner' }: ProductBadgeProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const badgeColors = useMemo(
    (): Record<ProductBadgeType, string> => ({
      new: colors.badgeNew,
      popular: colors.badgePopular,
      soldOut: colors.badgeSoldOut,
    }),
    [colors],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: kioskScreenLayout.badgePaddingHorizontal,
          paddingVertical: kioskScreenLayout.badgePaddingVertical,
          borderTopLeftRadius: kioskScreenLayout.badgePaddingHorizontal,
          borderBottomRightRadius: kioskScreenLayout.badgePaddingHorizontal,
        },
        ribbon: {
          borderTopLeftRadius: kioskScreenLayout.badgeRibbonRadius,
          borderBottomRightRadius: kioskScreenLayout.badgeRibbonRadius,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.badgeFontSize,
          lineHeight: kioskScreenLayout.badgeFontSize * 1.7,
          color: colors.cardBackground,
          textTransform: 'uppercase',
        },
      }),
    [colors],
  );

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeColors[badge] },
        variant === 'ribbon' && styles.ribbon,
      ]}>
      <Text style={styles.label}>{t(`menu.badges.${badge}`)}</Text>
    </View>
  );
}
