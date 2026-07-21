import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatProductPriceLabel } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';
import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type ProductDetailHeaderProps = {
  title: string;
  unitPrice: number;
};

export function ProductDetailHeader({ title, unitPrice }: ProductDetailHeaderProps) {
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const priceLabel = formatProductPriceLabel(
    unitPrice,
    pricing?.primaryCurrency ?? 'USD',
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: kioskScreenLayout.productDetailSectionGap,
        },
        title: {
          ...displayTextStyle(),
          flex: 1,
          fontSize: kioskScreenLayout.productDetailTitleSize,
          lineHeight: kioskScreenLayout.productDetailTitleLineHeight,
          color: colors.menuSectionHeading,
        },
        price: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailPriceSize,
          lineHeight: kioskScreenLayout.productDetailPriceLineHeight,
          color: colors.priceAccent,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} testID="product-detail-header">
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.price}>{priceLabel}</Text>
    </View>
  );
}
