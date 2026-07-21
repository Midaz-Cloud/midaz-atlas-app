import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  mediumTextStyle,
  useKioskScreenColors,
} from '@shared/theme';
import { retailScanLayout } from '@modules/ordering/retail/retailScanLayout';

export type OrderSummaryRowVariant = 'default' | 'total';

export type OrderSummaryRowProps = {
  label: string;
  value: string;
  variant?: OrderSummaryRowVariant;
  compact?: boolean;
  testID?: string;
};

export function OrderSummaryRow({
  label,
  value,
  variant = 'default',
  compact = false,
  testID,
}: OrderSummaryRowProps) {
  const colors = useKioskScreenColors();
  const isTotal = variant === 'total';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: compact
            ? retailScanLayout.checkoutRowGap
            : kioskScreenLayout.cartCheckoutRowGap,
        },
        label: {
          flex: 1,
        },
        value: {
          textAlign: 'right',
        },
        labelDefault: {
          ...bodyTextStyle(),
          fontSize: compact
            ? retailScanLayout.checkoutRowLabelSize
            : kioskScreenLayout.cartCheckoutRowLabelSize,
          lineHeight: compact
            ? retailScanLayout.checkoutRowLabelLineHeight
            : kioskScreenLayout.cartCheckoutRowLabelLineHeight,
          color: colors.menuSectionMuted,
        },
        labelTotal: {
          ...displayTextStyle(),
          fontSize: compact
            ? retailScanLayout.checkoutTotalLabelSize
            : kioskScreenLayout.cartCheckoutTotalLabelSize,
          lineHeight: compact
            ? retailScanLayout.checkoutTotalLabelLineHeight
            : kioskScreenLayout.cartCheckoutTotalLabelLineHeight,
          color: colors.cartCheckoutTotalLabel,
        },
        valueDefault: {
          ...mediumTextStyle(),
          fontSize: compact
            ? retailScanLayout.checkoutRowValueSize
            : kioskScreenLayout.cartCheckoutRowValueSize,
          lineHeight: compact
            ? retailScanLayout.checkoutRowValueLineHeight
            : kioskScreenLayout.cartCheckoutRowValueLineHeight,
          color: colors.menuSectionMuted,
        },
        valueTotal: {
          ...displayTextStyle(),
          fontSize: compact
            ? retailScanLayout.checkoutTotalValueSize
            : kioskScreenLayout.cartCheckoutTotalValueSize,
          lineHeight: compact
            ? retailScanLayout.checkoutTotalValueLineHeight
            : kioskScreenLayout.cartCheckoutTotalValueLineHeight,
          color: colors.cartCheckoutTotalValue,
        },
      }),
    [colors, compact],
  );

  return (
    <View style={styles.row} testID={testID}>
      <Text
        style={[styles.label, isTotal ? styles.labelTotal : styles.labelDefault]}
        numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.value, isTotal ? styles.valueTotal : styles.valueDefault]}>
        {value}
      </Text>
    </View>
  );
}
