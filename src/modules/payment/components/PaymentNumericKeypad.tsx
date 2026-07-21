import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
] as const;

export type PaymentNumericKeypadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  /** Backspace key uses kiosk primary color (Figma P8a 195:2). */
  accentBackspace?: boolean;
};

export function PaymentNumericKeypad({
  onDigit,
  onBackspace,
  disabled = false,
  accentBackspace = false,
}: PaymentNumericKeypadProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        grid: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentReferenceKeypadGap,
        },
        row: {
          flexDirection: 'row',
          gap: kioskScreenLayout.paymentReferenceKeypadGap,
        },
        key: {
          flex: 1,
          height: kioskScreenLayout.paymentReferenceKeypadKeyHeight,
          borderRadius: kioskScreenLayout.paymentReferenceKeypadKeyRadius,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceKeypadKeyBorder,
          backgroundColor: colors.paymentReferenceKeypadKeyBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        keySpacer: {
          flex: 1,
        },
        keyDisabled: {
          opacity: 0.45,
        },
        keyPressed: {
          opacity: 0.85,
        },
        keyLabel: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceKeypadKeyFontSize,
          color: colors.title,
        },
        keyBackAccent: {
          backgroundColor: colors.priceAccent,
          borderColor: colors.priceAccent,
        },
        keyBackAccentLabel: {
          color: colors.cardBackground,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.grid}>
      {KEYS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key) => {
            if (key === '') {
              return <View key="spacer" style={styles.keySpacer} />;
            }
            const isBack = key === 'back';
            const label = isBack ? '⌫' : key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={isBack ? 'Borrar' : key}
                disabled={disabled}
                onPress={() => (isBack ? onBackspace() : onDigit(key))}
                style={({ pressed }) => [
                  styles.key,
                  isBack && accentBackspace && styles.keyBackAccent,
                  disabled && styles.keyDisabled,
                  pressed && !disabled && styles.keyPressed,
                ]}
                testID={isBack ? 'payment-reference-key-back' : `payment-reference-key-${key}`}>
                <Text
                  style={[
                    styles.keyLabel,
                    isBack && accentBackspace && styles.keyBackAccentLabel,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
