import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

import { ProductDetailPrimaryCta } from '../../product-detail/components/ProductDetailPrimaryCta';
import type { ToppingModifier } from '../types';
import { ModifiersOrderSummary } from './ModifiersOrderSummary';
import { SelectedToppingsChips } from './SelectedToppingsChips';

export type ModifiersBottomBarProps = {
  selectedToppings: (ToppingModifier & { quantity?: number })[];
  orderSummaryLabel: string;
  totalUsd: number;
  canAdd: boolean;
  primaryLabel: string;
  onRemoveTopping: (toppingId: string) => void;
  onPrimary: () => void;
};

export function ModifiersBottomBar({
  selectedToppings,
  orderSummaryLabel,
  totalUsd,
  canAdd,
  primaryLabel,
  onRemoveTopping,
  onPrimary,
}: ModifiersBottomBarProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: kioskScreenLayout.modifiersBottomBorderWidth,
          borderTopColor: colors.productDetailBorder,
          borderTopLeftRadius: kioskScreenLayout.modifiersBottomRadius,
          borderTopRightRadius: kioskScreenLayout.modifiersBottomRadius,
          paddingHorizontal: kioskScreenLayout.modifiersBottomPadding,
          paddingTop: kioskScreenLayout.modifiersBottomPaddingTop,
          paddingBottom: kioskScreenLayout.modifiersBottomPadding,
          gap: kioskScreenLayout.modifiersBottomGap,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.sheet, kioskScreenShadows.modifiersBottomBar]} testID="modifiers-bottom-bar">
      {selectedToppings.length > 0 ? (
        <SelectedToppingsChips toppings={selectedToppings} onRemove={onRemoveTopping} />
      ) : null}
      <ModifiersOrderSummary label={orderSummaryLabel} totalUsd={totalUsd} />
      <ProductDetailPrimaryCta
        label={primaryLabel}
        disabled={!canAdd}
        onPress={onPrimary}
        testID="modifiers-primary-cta"
      />
    </View>
  );
}
