import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { useKioskOrder } from '@shared/kiosk-order';
import { useKioskSession } from '@shared/session';
import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import {
  OrderNumberCard,
  OrderOutcomeHintRow,
  PaymentPrimaryCta,
  PaymentStatusIllustration,
} from '../components';
import { referenceFlowLayoutStyles } from '../reference/referenceFlowLayout';
import { useOrderOutcomeAutoDismiss } from './hooks/useOrderOutcomeAutoDismiss';
import { useOrderOutcomeScreen } from './hooks/useOrderOutcomeScreen';
import { OrderOutcomeQrContent } from './OrderOutcomeQrContent';
import { resolveOrderSuccessDisplayMode } from './resolveOrderSuccessDisplayMode';
import type { OrderOutcomeVariant, OrderSuccessDisplayMode } from './types';
import { ORDER_OUTCOME_AUTO_DISMISS_MS } from './types';

export type OrderOutcomeScreenProps = {
  variant: OrderOutcomeVariant;
  /** Override Storybook; en app usa `printQrEnabled` de GET /kiosk/config. */
  successDisplayMode?: OrderSuccessDisplayMode;
  onCallCashier?: () => void;
  onSessionComplete: () => void;
};

/** P14 éxito / P15 QR / P14.1 error fiscal (Figma 57:235 · 64:2 · 57:346). */
export function OrderOutcomeScreen({
  variant,
  successDisplayMode,
  onCallCashier,
  onSessionComplete,
}: OrderOutcomeScreenProps) {
  const { orderId } = useKioskOrder();
  const { runtimeConfig } = useKioskSession();
  const { success, fiscalError, digitalTicket } = useOrderOutcomeScreen();
  const colors = useKioskScreenColors();
  const mode =
    successDisplayMode ??
    resolveOrderSuccessDisplayMode(runtimeConfig?.printQrEnabled ?? false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        successSubtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
        },
        successSubtitleSemibold: {
          fontWeight: '600',
        },
        fiscalSubtitle: {
          alignItems: 'center',
          gap: kioskScreenLayout.paymentOutcomeBlockGap,
        },
        fiscalSubtitleSemibold: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentOutcomeSubtitleSemiboldSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
          fontWeight: '600',
        },
        fiscalSubtitleRegular: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
        },
        successFooter: {
          alignSelf: 'stretch',
          alignItems: 'center',
          gap: kioskScreenLayout.paymentOutcomeContentGap,
          marginTop: kioskScreenLayout.paymentOutcomeContentGap,
          width: '100%',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
        },
      }),
    [colors],
  );

  useOrderOutcomeAutoDismiss(
    variant === 'success',
    ORDER_OUTCOME_AUTO_DISMISS_MS,
    onSessionComplete,
  );

  if (variant === 'success' && mode === 'qr') {
    return (
      <KioskScreenLayout
        testID="payment-order-outcome-qr-screen"
        showPattern
        contentAlign="center"
        contentStyle={referenceFlowLayoutStyles.content}>
        <View style={referenceFlowLayoutStyles.inner}>
          <OrderOutcomeQrContent copy={digitalTicket} />
        </View>
      </KioskScreenLayout>
    );
  }

  if (variant === 'success') {
    return (
      <KioskScreenLayout
        testID="payment-order-outcome-success-screen"
        showPattern
        contentAlign="center"
        contentStyle={referenceFlowLayoutStyles.content}>
        <View style={referenceFlowLayoutStyles.inner}>
          <PaymentStatusIllustration
            variant="success"
            title={success.title}
            subtitleContent={
              <Text style={styles.successSubtitle}>
                <Text style={styles.successSubtitleSemibold}>
                  {success.ticketPrinted}{' '}
                </Text>
                {success.pickupInstructions}
              </Text>
            }
            footer={
              orderId ? (
                <View style={styles.successFooter}>
                  <OrderNumberCard orderId={orderId} label={success.orderLabel} />
                  <OrderOutcomeHintRow message={success.ticketSlotHint} />
                </View>
              ) : null
            }
          />
        </View>
      </KioskScreenLayout>
    );
  }

  return (
    <KioskScreenLayout
      testID="payment-order-outcome-fiscal-error-screen"
      showPattern
      contentAlign="center"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={referenceFlowLayoutStyles.inner}>
        <PaymentStatusIllustration
          variant="fiscal_error"
          title={fiscalError.title}
          subtitleContent={
            <View style={styles.fiscalSubtitle}>
              <Text style={styles.fiscalSubtitleSemibold}>{fiscalError.paymentOk}</Text>
              <Text style={styles.fiscalSubtitleRegular}>{fiscalError.askCashier}</Text>
            </View>
          }
          footer={
            <PaymentPrimaryCta
              label={fiscalError.callCashier}
              showChevron={false}
              onPress={onCallCashier ?? (() => {})}
              testID="payment-outcome-call-cashier"
            />
          }
        />
      </View>
    </KioskScreenLayout>
  );
}
