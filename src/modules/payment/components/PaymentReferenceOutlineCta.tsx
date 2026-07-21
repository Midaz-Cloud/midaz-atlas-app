import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type PaymentReferenceOutlineCtaProps = {
  label: string;
  onPress: () => void;
  testID?: string;
};

/** CTA secundario P12.1 (Figma 53:164). */
export function PaymentReferenceOutlineCta({
  label,
  onPress,
  testID = 'payment-reference-help',
}: PaymentReferenceOutlineCtaProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cta: {
          alignSelf: 'stretch',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: kioskScale(4),
          borderColor: colors.title,
          borderRadius: kioskScreenLayout.productDetailCtaRadius,
          paddingVertical: kioskScreenLayout.productDetailCtaPaddingVertical,
          backgroundColor: 'transparent',
        },
        pressed: {
          opacity: 0.9,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCtaFontSize,
          lineHeight: kioskScreenLayout.productDetailCtaLineHeight,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      testID={testID}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
