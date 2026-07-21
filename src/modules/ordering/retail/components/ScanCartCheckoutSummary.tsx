import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPrimaryPrice } from '@shared/pricing';
import { useBcvExchangeRate, useKioskPricing } from '@shared/session';
import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { formatVesPrice } from '@shared/utils/formatPrice';

import IconCart from '@assets/images/ordering/menu/icon-cart.svg';

import type { OrderTotals } from '../../hooks/useOrderTotals';
import { retailScanLayout } from '../retailScanLayout';

export type ScanCartCheckoutSummaryProps = {
  itemCount: number;
  totals: OrderTotals;
};

export function ScanCartCheckoutSummary({ itemCount, totals }: ScanCartCheckoutSummaryProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const bcvRate = useBcvExchangeRate();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const isUsdPrimary = primaryCurrency.toUpperCase() === 'USD';
  const showVesConversion = isUsdPrimary && bcvRate != null;
  const totalLabel = formatPrimaryPrice(totals.totalUsd, primaryCurrency);
  const vesTotalLabel = formatVesPrice(totals.totalVes);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.checkoutSummaryGap,
        },
        left: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.checkoutSummaryGap,
          minWidth: 0,
        },
        cartIconBox: {
          width: retailScanLayout.checkoutCartIconBoxSize,
          height: retailScanLayout.checkoutCartIconBoxSize,
          borderRadius: retailScanLayout.checkoutCartIconBoxRadius,
          backgroundColor: colors.priceAccent,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        textCol: {
          flex: 1,
          gap: retailScanLayout.checkoutSummaryTextGap,
          minWidth: 0,
        },
        itemsSelected: {
          fontSize: retailScanLayout.checkoutItemsSelectedSize,
          lineHeight: retailScanLayout.checkoutItemsSelectedLineHeight,
          color: colors.menuSectionMuted,
        },
        orderTotalTitle: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.checkoutOrderTitleSize,
          lineHeight: retailScanLayout.checkoutOrderTitleLineHeight,
          color: colors.title,
        },
        amountCol: {
          alignItems: 'flex-end',
          flexShrink: 0,
        },
        totalAmount: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.checkoutTotalAmountSize,
          lineHeight: retailScanLayout.checkoutTotalAmountLineHeight,
          color: colors.priceAccent,
        },
        vesConversion: {
          fontSize: retailScanLayout.checkoutConversionSize,
          lineHeight: retailScanLayout.checkoutConversionLineHeight,
          color: colors.menuSectionMuted,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} testID="scan-cart-checkout-summary">
      <View style={styles.left}>
        <View style={styles.cartIconBox}>
          <IconCart
            width={retailScanLayout.checkoutCartIconSize}
            height={retailScanLayout.checkoutCartIconSize}
            color={colors.cartIcon}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.itemsSelected}>
            {t('scanCart.cart.linesSelected', { count: itemCount })}
          </Text>
          <Text style={styles.orderTotalTitle}>{t('scanCart.checkout.orderTotalTitle')}</Text>
        </View>
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.totalAmount}>{totalLabel}</Text>
        {showVesConversion ? (
          <Text style={styles.vesConversion}>{vesTotalLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}
