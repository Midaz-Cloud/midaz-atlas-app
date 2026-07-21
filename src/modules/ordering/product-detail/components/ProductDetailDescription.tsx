import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type ProductDetailDescriptionProps = {
  text: string;
};

export function ProductDetailDescription({ text }: ProductDetailDescriptionProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        text: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.productDetailDescriptionSize,
          lineHeight: kioskScreenLayout.productDetailDescriptionLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'justify',
        },
      }),
    [colors],
  );

  return (
    <Text style={styles.text} testID="product-detail-description">
      {text}
    </Text>
  );
}
