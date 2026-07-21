import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

import { OrderSummaryBreakdown } from '../../components/OrderSummaryBreakdown';
import type { OrderTotals } from '../../hooks/useOrderTotals';
import { ProductDetailPrimaryCta } from '../../product-detail/components/ProductDetailPrimaryCta';

export type CartCheckoutSheetProps = {
  totals: OrderTotals;
  showIgtf?: boolean;
  onPressPrimary: () => void;
};

export function CartCheckoutSheet({
  totals,
  showIgtf = false,
  onPressPrimary,
}: CartCheckoutSheetProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheet: {
          alignItems: 'stretch',
          backgroundColor: colors.cardBackground,
          borderTopWidth: kioskScreenLayout.cartCheckoutBorderWidth,
          borderTopColor: colors.productDetailBorder,
          borderTopLeftRadius: kioskScreenLayout.cartCheckoutRadius,
          borderTopRightRadius: kioskScreenLayout.cartCheckoutRadius,
          paddingHorizontal: kioskScreenLayout.cartCheckoutPadding,
          paddingTop: kioskScreenLayout.cartCheckoutPaddingTop,
          paddingBottom: kioskScreenLayout.cartCheckoutPadding,
          gap: kioskScreenLayout.cartCheckoutGap,
        },
      }),
    [colors],
  );

  return (
    <View
      style={[styles.sheet, kioskScreenShadows.cartCheckoutSheet]}
      testID="cart-checkout-sheet">
      <OrderSummaryBreakdown totals={totals} showIgtf={showIgtf} />
      <ProductDetailPrimaryCta
        label={t('cart.checkout.pay')}
        onPress={onPressPrimary}
        testID="cart-checkout-pay"
      />
    </View>
  );
}
