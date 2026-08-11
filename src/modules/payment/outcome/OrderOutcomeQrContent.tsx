import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useKioskOrder } from '@shared/kiosk-order';
import { useKioskPricing } from '@shared/session';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';
import IconCheckCircle from '@assets/images/payment/outcome/icon-check-circle.svg';

import { OrderDigitalTicketQr } from './components/OrderDigitalTicketQr';
import { OrderOutcomeInfoBanner } from './components/OrderOutcomeInfoBanner';
import { OrderOutcomeSummaryBanner } from './components/OrderOutcomeSummaryBanner';
import type { OrderOutcomeDigitalTicketCopy } from './hooks/useOrderOutcomeScreen';

export type OrderOutcomeQrContentProps = {
  copy: OrderOutcomeDigitalTicketCopy;
};

/** P15 · Ticket QR (Figma 64:2). */
export function OrderOutcomeQrContent({ copy }: OrderOutcomeQrContentProps) {
  const { orderId, totalUsd, confirmedOrder, primaryCurrency } = useKioskOrder();
  const pricing = useKioskPricing();
  const colors = useKioskScreenColors();
  const iconSize = kioskScreenLayout.paymentOutcomeQrBannerIconSize;

  const currencyCode =
    confirmedOrder?.currencyCode ??
    primaryCurrency ??
    pricing?.primaryCurrency ??
    'USD';
  const totalAmount = confirmedOrder?.grandTotalCurrency ?? totalUsd;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignSelf: 'stretch',
          alignItems: 'center',
          gap: kioskScreenLayout.paymentOutcomeBlockGap,
          width: '100%',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScreenLayout.paymentOutcomeQrTitleSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrTitleLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        subtitleBlock: {
          alignItems: 'center',
          paddingBottom: kioskScreenLayout.paymentOutcomeBlockGap,
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeQrSubtitleSize,
          lineHeight: kioskScreenLayout.paymentOutcomeQrSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  if (!orderId) {
    return null;
  }

  return (
    <View style={styles.root} testID="payment-order-outcome-qr-content">
      <Text style={styles.title}>{copy.title}</Text>
      <View style={styles.subtitleBlock}>
        <Text style={styles.subtitle}>{copy.subtitleLine1}</Text>
        <Text style={styles.subtitle}>{copy.subtitleLine2}</Text>
      </View>
      <OrderDigitalTicketQr orderId={orderId} />
      <OrderOutcomeInfoBanner
        message={copy.mobileHint}
        icon={
          <IconMobile width={iconSize} height={iconSize} color={colors.priceAccent} />
        }
      />
      <OrderOutcomeSummaryBanner
        orderId={orderId}
        orderPrefix={copy.orderPrefix}
        totalAmount={totalAmount}
        currencyCode={currencyCode}
        paymentCompletedLabel={copy.paymentCompleted}
        paymentStatusIcon={
          <IconCheckCircle width={iconSize} height={iconSize} />
        }
      />
    </View>
  );
}
