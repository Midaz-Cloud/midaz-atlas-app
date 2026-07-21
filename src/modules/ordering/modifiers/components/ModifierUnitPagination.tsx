import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type ModifierUnitPaginationProps = {
  currentUnit: number;
  totalUnits: number;
  productName: string;
  testID?: string;
};

/** Orange pill badge: `1/2 Vaso grande` (Figma 178:2, P6.1 / P6.2). */
export function ModifierUnitPagination({
  currentUnit,
  totalUnits,
  productName,
  testID = 'modifier-unit-pagination',
}: ModifierUnitPaginationProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'flex-start',
          paddingHorizontal: kioskScreenLayout.modifiersHeaderPaddingHorizontal,
          marginTop: kioskScreenLayout.modifierUnitBadgeMarginTop,
        },
        badge: {
          alignSelf: 'flex-start',
          backgroundColor: colors.priceAccent,
          borderRadius: kioskScreenLayout.modifierUnitBadgeRadius,
          paddingHorizontal: kioskScreenLayout.modifierUnitBadgePaddingHorizontal,
          paddingVertical: kioskScreenLayout.modifierUnitBadgePaddingVertical,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.modifierUnitBadgeFontSize,
          lineHeight: kioskScreenLayout.modifierUnitBadgeLineHeight,
          color: colors.cardBackground,
        },
      }),
    [colors],
  );

  if (totalUnits <= 1) {
    return null;
  }

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.badge} testID={`${testID}-badge`}>
        <Text style={styles.label}>
          {t('modifiers.unitBadge', {
            current: currentUnit,
            total: totalUnits,
            product: productName,
          })}
        </Text>
      </View>
    </View>
  );
}
