import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

import { ProductDetailCartSummary } from './ProductDetailCartSummary';
import { ProductDetailPrimaryCta } from './ProductDetailPrimaryCta';

export type ProductDetailBottomBarProps = {
  itemCount: number;
  totalUsd: number;
  projectedItemCount?: number;
  projectedTotalUsd?: number;
  primaryLabel: string;
  soldOut?: boolean;
  onPressCart: () => void;
  onPressPrimary: () => void;
};

export function ProductDetailBottomBar({
  itemCount,
  totalUsd,
  projectedItemCount,
  projectedTotalUsd,
  primaryLabel,
  soldOut = false,
  onPressCart,
  onPressPrimary,
}: ProductDetailBottomBarProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: kioskScreenLayout.productDetailBottomBorderWidth,
          borderTopColor: colors.productDetailBorder,
          borderTopLeftRadius: kioskScreenLayout.productDetailBottomRadius,
          borderTopRightRadius: kioskScreenLayout.productDetailBottomRadius,
          paddingHorizontal: kioskScreenLayout.productDetailBottomPadding,
          paddingTop: kioskScreenLayout.productDetailBottomPaddingTop,
          paddingBottom: kioskScreenLayout.productDetailBottomPadding,
          gap: kioskScreenLayout.productDetailBottomGap,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.sheet, kioskScreenShadows.productDetailBottomBar]} testID="product-detail-bottom-bar">
      <ProductDetailCartSummary
        itemCount={itemCount}
        totalUsd={totalUsd}
        projectedItemCount={projectedItemCount}
        projectedTotalUsd={projectedTotalUsd}
        onPress={onPressCart}
      />
      <ProductDetailPrimaryCta
        label={primaryLabel}
        disabled={soldOut}
        onPress={onPressPrimary}
      />
    </View>
  );
}
