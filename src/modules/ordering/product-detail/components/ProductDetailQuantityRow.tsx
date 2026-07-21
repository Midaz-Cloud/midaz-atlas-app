import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import { ProductDetailQuantityControls } from './ProductDetailQuantityControls';

export type ProductDetailQuantityRowProps = {
  quantity: number;
  maxQuantity?: number;
  onDecrement: () => void;
  onIncrement: () => void;
};

/** Fila Cantidad + controles +/- (Figma 35:172). */
export function ProductDetailQuantityRow({
  quantity,
  maxQuantity,
  onDecrement,
  onIncrement,
}: ProductDetailQuantityRowProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: kioskScreenLayout.productDetailQuantityRowHeight,
          borderWidth: kioskScreenLayout.productDetailQuantityRowBorderWidth,
          borderColor: colors.productDetailBorder,
          borderRadius: kioskScreenLayout.productDetailQuantityRowRadius,
          backgroundColor: colors.cardBackground,
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailQuantityLabelSize,
          lineHeight: kioskScreenLayout.productDetailQuantityLabelLineHeight,
          color: colors.menuSectionHeading,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} testID="product-detail-quantity-row">
      <Text style={styles.label}>{t('productDetail.quantity')}</Text>
      <ProductDetailQuantityControls
        value={quantity}
        max={maxQuantity}
        onDecrement={onDecrement}
        onIncrement={onIncrement}
      />
    </View>
  );
}
