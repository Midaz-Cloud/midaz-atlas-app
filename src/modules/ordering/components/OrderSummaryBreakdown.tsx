import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useContext } from 'react';

import { KioskOrderContext } from '@shared/kiosk-order/KioskOrderProvider';
import { formatPrimaryPrice } from '@shared/pricing';
import { useBcvExchangeRate, useKioskPricing, useKioskOrganization } from '@shared/session';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { retailScanLayout } from '@modules/ordering/retail/retailScanLayout';

import { CartCheckoutBcvBanner } from './CartCheckoutBcvBanner';
import type { OrderTotals } from '../hooks/useOrderTotals';
import { OrderSummaryRow } from './OrderSummaryRow';

export type OrderSummaryBreakdownProps = {
  totals: OrderTotals;
  /** Overrides session config rate (e.g. Storybook). */
  bcvRate?: number;
  /** Overrides org primary currency (e.g. Storybook). */
  primaryCurrency?: string;
  showIgtf?: boolean;
  compact?: boolean;
};

export function OrderSummaryBreakdown({
  totals,
  bcvRate: bcvRateOverride,
  primaryCurrency: primaryCurrencyOverride,
  showIgtf = false,
  compact = false,
}: OrderSummaryBreakdownProps) {
  const sessionBcvRate = useBcvExchangeRate();
  const bcvRate = bcvRateOverride ?? sessionBcvRate;
  const orderContext = useContext(KioskOrderContext);
  const pricing = useKioskPricing();
  const organization = useKioskOrganization();
  const declaresTaxes = organization?.declaresTaxes ?? false;
  const primaryCurrency =
    primaryCurrencyOverride ??
    orderContext?.primaryCurrency ??
    pricing?.primaryCurrency ??
    'USD';
  const formatTotal = (amount: number) => formatPrimaryPrice(amount, primaryCurrency);
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          gap: compact
            ? retailScanLayout.footerGap
            : kioskScreenLayout.cartCheckoutGap,
          alignSelf: 'stretch',
        },
        summary: {
          alignSelf: 'stretch',
          paddingBottom: compact
            ? retailScanLayout.checkoutSummaryPaddingBottom
            : kioskScreenLayout.cartCheckoutSummaryPaddingBottom,
          gap: compact
            ? retailScanLayout.checkoutRowGap
            : kioskScreenLayout.cartCheckoutRowGap,
        },
        rows: {
          gap: compact
            ? retailScanLayout.checkoutRowGap
            : kioskScreenLayout.cartCheckoutRowGap,
        },
        divider: {
          height: compact
            ? retailScanLayout.checkoutDividerHeight
            : kioskScreenLayout.cartCheckoutDividerHeight,
          backgroundColor: colors.cartCheckoutDivider,
          alignSelf: 'stretch',
        },
      }),
    [colors, compact],
  );
  const { t } = useTranslation('ordering');
  const hasIgtf = showIgtf && totals.igtfUsd != null && totals.igtfUsd > 0;

  return (
    <View style={styles.wrap} testID="order-summary-breakdown">
      {bcvRate != null ? <CartCheckoutBcvBanner bcvRate={bcvRate} compact={compact} /> : null}

      <View style={styles.summary}>
        <View style={styles.rows}>
          <OrderSummaryRow
            label={t('cart.checkout.subtotal')}
            value={formatTotal(totals.subtotalUsd)}
            compact={compact}
            testID="order-summary-subtotal"
          />
          {declaresTaxes ? (
            <OrderSummaryRow
              label={t('cart.checkout.tax')}
              value={formatTotal(totals.taxUsd)}
              compact={compact}
              testID="order-summary-tax"
            />
          ) : null}
          {hasIgtf ? (
            <OrderSummaryRow
              label={t('cart.checkout.igtf')}
              value={formatTotal(totals.igtfUsd!)}
              compact={compact}
              testID="order-summary-igtf"
            />
          ) : null}
        </View>

        <View style={styles.divider} testID="order-summary-divider" />

        <OrderSummaryRow
          label={t('cart.checkout.total')}
          value={formatTotal(totals.totalUsd)}
          variant="total"
          compact={compact}
          testID="order-summary-total"
        />
      </View>
    </View>
  );
}
