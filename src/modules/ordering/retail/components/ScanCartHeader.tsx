import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BackButton } from '@shared/components';
import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils/kioskLayout';

import { retailScanLayout } from '../retailScanLayout';

export type ScanCartHeaderProps = {
  paddingTop: number;
  onBack: () => void;
};

export function ScanCartHeader({ paddingTop, onBack }: ScanCartHeaderProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
          paddingBottom: retailScanLayout.headerPaddingBottom,
          backgroundColor: colors.screenBackground,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScale(8),
          paddingHorizontal: retailScanLayout.headerChipPaddingH,
          paddingVertical: retailScanLayout.headerChipPaddingV,
          borderRadius: kioskScale(999),
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
        },
        dot: {
          width: retailScanLayout.headerDotSize,
          height: retailScanLayout.headerDotSize,
          borderRadius: retailScanLayout.headerDotSize / 2,
          backgroundColor: '#22c55e',
        },
        chipLabel: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.headerChipFontSize,
          lineHeight: retailScanLayout.headerChipFontSize + 6,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.wrap, { paddingTop }]} testID="scan-cart-header">
      <BackButton onPress={onBack} testID="scan-cart-back" />
      <View style={styles.chip} testID="scan-cart-active-reader">
        <View style={styles.dot} />
        <Text style={styles.chipLabel}>{t('scanCart.header.activeReader')}</Text>
      </View>
    </View>
  );
}
