import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

const DEFAULT_CODE_LENGTH = 6;

export type PaymentReferenceInputCardProps = {
  label: string;
  value: string;
  /** Longitud esperada del código (por defecto 6 para referencia de pago). */
  codeLength?: number;
};

export function PaymentReferenceInputCard({
  label,
  value,
  codeLength = DEFAULT_CODE_LENGTH,
}: PaymentReferenceInputCardProps) {
  const colors = useKioskScreenColors();
  const display =
    value.length > 0
      ? value.padEnd(codeLength, '•').slice(0, codeLength)
      : label;

  const isPlaceholder = value.length === 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          alignSelf: 'stretch',
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceInputBorder,
          borderRadius: kioskScreenLayout.paymentReferenceInputRadius,
          paddingHorizontal: kioskScreenLayout.paymentReferenceInputPaddingHorizontal,
          paddingVertical: kioskScreenLayout.paymentReferenceInputPaddingVertical,
          justifyContent: 'center',
          minHeight: kioskScale(122),
        },
        text: {
          ...displayTextStyle(),
        },
        placeholder: {
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
          lineHeight: kioskScreenLayout.paymentReferenceInputLabelLineHeight,
          color: colors.title,
        },
        digits: {
          fontSize: kioskScreenLayout.paymentReferenceDigitsSize,
          letterSpacing: kioskScreenLayout.paymentReferenceDigitsLetterSpacing,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card} accessibilityLabel={label}>
      <Text
        style={[styles.text, isPlaceholder ? styles.placeholder : styles.digits]}
        numberOfLines={1}>
        {display}
      </Text>
    </View>
  );
}
