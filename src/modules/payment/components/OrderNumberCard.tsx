import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import { formatOrderDisplayNumber } from '../outcome/formatOrderDisplayNumber';

export type OrderNumberCardProps = {
  orderId: string;
  label: string;
};

/** Tarjeta # pedido P14 (Figma 57:272). */
export function OrderNumberCard({ orderId, label }: OrderNumberCardProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          alignSelf: 'stretch',
          width: '100%',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
          backgroundColor: colors.paymentOutcomeOrderCardBg,
          borderWidth: kioskScreenLayout.paymentOutcomeOrderCardBorderWidth,
          borderColor: colors.paymentOutcomeOrderCardBorder,
          borderRadius: kioskScreenLayout.paymentOutcomeOrderCardRadius,
          paddingHorizontal: kioskScreenLayout.paymentOutcomeOrderCardPaddingHorizontal,
          paddingVertical: kioskScreenLayout.paymentOutcomeOrderCardPaddingVertical,
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScreenLayout.paymentOutcomeOrderCardInnerGap,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeOrderLabelSize,
          lineHeight: kioskScreenLayout.paymentOutcomeOrderLabelLineHeight,
          color: colors.paymentOutcomeAccent,
          textAlign: 'center',
          fontWeight: '600',
        },
        number: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeOrderNumberSize,
          lineHeight: kioskScreenLayout.paymentOutcomeOrderNumberLineHeight,
          color: colors.paymentOutcomeAccent,
          textAlign: 'center',
          fontWeight: '700',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card} accessibilityLabel={`${label} ${orderId}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.number}>{formatOrderDisplayNumber(orderId)}</Text>
    </View>
  );
}
