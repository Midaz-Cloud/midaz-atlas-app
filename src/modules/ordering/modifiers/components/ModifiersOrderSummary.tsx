import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { useKioskPricing } from '@shared/session';
import { formatPrimaryPrice } from '@shared/pricing';

export type ModifiersOrderSummaryProps = {
  label: string;
  totalUsd: number;
};

export function ModifiersOrderSummary({ label, totalUsd }: ModifiersOrderSummaryProps) {
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kioskScreenLayout.modifiersBottomPadding * 0.5,
        },
        label: {
          ...displayTextStyle(),
          flex: 1,
          fontSize: kioskScreenLayout.modifiersSummaryLabelSize,
          lineHeight: kioskScreenLayout.modifiersSummaryLabelLineHeight,
          color: colors.title,
          marginRight: kioskScreenLayout.modifiersHeaderGap,
        },
        price: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.modifiersSummaryPriceSize,
          lineHeight: kioskScreenLayout.modifiersSummaryPriceLineHeight,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} testID="modifiers-order-summary">
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.price}>{formatPrimaryPrice(totalUsd, primaryCurrency)}</Text>
    </View>
  );
}
