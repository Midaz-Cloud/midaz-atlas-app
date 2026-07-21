import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  mediumTextStyle,
  useKioskScreenColors,
} from '@shared/theme';

export type PaymentReadOnlyFieldProps = {
  label: string;
  value: string;
  testID?: string;
  tallValue?: boolean;
  fullWidth?: boolean;
  /** Menor separación label/valor (cuenta destino pago móvil). */
  compact?: boolean;
};

/** Campo de solo lectura (Figma 48:15–48:32 · 48:79–48:90). */
export function PaymentReadOnlyField({
  label,
  value,
  testID,
  tallValue = false,
  fullWidth = false,
  compact = false,
}: PaymentReadOnlyFieldProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          width: kioskScreenLayout.paymentMobileFieldWidth,
          gap: kioskScreenLayout.paymentMethodHeaderGap,
        },
        rootFullWidth: {
          width: '100%',
          maxWidth: kioskScreenLayout.paymentAccountFieldFullWidth,
        },
        label: {
          ...mediumTextStyle(),
          fontSize: kioskScreenLayout.paymentMobileFieldLabelSize,
          lineHeight: kioskScreenLayout.paymentMobileFieldLabelLineHeight,
          color: colors.menuSectionMuted,
        },
        valueWrap: {
          minHeight: kioskScreenLayout.paymentMobileFieldMinHeight,
          justifyContent: 'center',
        },
        valueWrapTall: {
          minHeight: kioskScreenLayout.paymentMobileFieldTallMinHeight,
        },
        value: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentMobileFieldValueSize,
          color: colors.title,
        },
        rootCompact: {
          gap: kioskScreenLayout.paymentMobileLabelValueGap,
        },
        labelCompact: {
          lineHeight: kioskScreenLayout.paymentMobileFieldLabelLineHeightCompact,
        },
        valueWrapCompact: {
          minHeight: kioskScreenLayout.paymentMobileReadOnlyMinHeightCompact,
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  return (
    <View
      style={[
        styles.root,
        compact && styles.rootCompact,
        fullWidth && styles.rootFullWidth,
      ]}
      testID={testID}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <View
        style={[
          styles.valueWrap,
          compact && styles.valueWrapCompact,
          tallValue && styles.valueWrapTall,
        ]}>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}
