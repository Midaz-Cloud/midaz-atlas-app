import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPrimaryPrice } from '@shared/pricing';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import { formatOrderDisplayNumber } from '../formatOrderDisplayNumber';

export type OrderOutcomeSummaryBannerProps = {
  orderId: string;
  orderPrefix: string;
  /** Amount in organization primary currency (or confirmed order currency). */
  totalAmount: number;
  currencyCode: string;
  paymentStatusIcon: ReactNode;
  paymentCompletedLabel: string;
  testID?: string;
};

/** Resumen orden + pago P15 (Figma 64:31). */
export function OrderOutcomeSummaryBanner({
  orderId,
  orderPrefix,
  totalAmount,
  currencyCode,
  paymentStatusIcon,
  paymentCompletedLabel,
  testID = 'payment-outcome-summary-banner',
}: OrderOutcomeSummaryBannerProps) {
  const colors = useKioskScreenColors();
  const orderLabel = `${orderPrefix} ${formatOrderDisplayNumber(orderId)}`;
  const totalLabel = formatPrimaryPrice(totalAmount, currencyCode);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          alignSelf: 'stretch',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
          backgroundColor: colors.cartCheckoutBcvBannerBg,
          borderRadius: kioskScreenLayout.cartCheckoutBcvBannerRadius,
          borderWidth: kioskScreenLayout.cartCheckoutBcvBannerBorderWidth,
          borderColor: colors.cartCheckoutBcvBannerBorder,
          paddingVertical: kioskScreenLayout.cartCheckoutBcvBannerPaddingVertical,
          paddingHorizontal: kioskScreenLayout.cartCheckoutBcvBannerPaddingHorizontal,
          gap: kioskScreenLayout.paymentOutcomeQrSummaryRowGap,
        },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          alignSelf: 'stretch',
        },
        orderLabel: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeQrBannerTextSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrBannerTextLineHeight,
          color: colors.title,
        },
        total: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScreenLayout.paymentOutcomeQrBannerTextSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrBannerTextLineHeight,
          color: colors.title,
        },
        statusRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.paymentOutcomeQrBannerInnerGap,
        },
        statusIconWrap: {
          width: kioskScreenLayout.paymentOutcomeQrBannerIconSize,
          height: kioskScreenLayout.paymentOutcomeQrBannerIconSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        statusLabel: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeQrBannerTextSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrBannerTextLineHeight,
          color: colors.paymentOutcomeQrPaymentStatus,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.banner} testID={testID}>
      <View style={styles.topRow}>
        <Text style={styles.orderLabel}>{orderLabel}</Text>
        <Text style={styles.total} testID={`${testID}-total`}>
          {totalLabel}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <View style={styles.statusIconWrap}>{paymentStatusIcon}</View>
        <Text style={styles.statusLabel}>{paymentCompletedLabel}</Text>
      </View>
    </View>
  );
}
