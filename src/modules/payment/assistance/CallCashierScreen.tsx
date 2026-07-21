import { useCallback, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { useKioskOrder } from '@shared/kiosk-order';
import { useKioskSession } from '@shared/session';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconEngineering from '@assets/images/payment/assistance/icon-engineering.svg';

import { OrderNumberCard, PaymentPrimaryCta, PaymentReferenceOutlineCta } from '../components';
import { referenceFlowLayoutStyles } from '../reference/referenceFlowLayout';
import { useAssistanceTimeout } from './hooks/useAssistanceTimeout';
import {
  requestCashierAssistance,
  type CashierAssistanceReason,
} from './services/requestCashierAssistance';

export type CallCashierScreenProps = {
  reason: CashierAssistanceReason;
  onCancelOrder: () => void;
  onTimeout?: () => void;
};

const ASSISTANCE_SESSION_ID = 'session-mock';

/** P19 · Llamar al cajero (Figma 72:27). */
export function CallCashierScreen({
  reason,
  onCancelOrder,
  onTimeout,
}: CallCashierScreenProps) {
  const { t } = useTranslation('payment');
  const { orderId } = useKioskOrder();
  const { deviceSerial } = useKioskSession();
  const colors = useKioskScreenColors();
  const iconSize = kioskScreenLayout.paymentAssistanceIconSize;

  const styles = useMemo(
    () => ({
      inner: {
        alignItems: 'center' as const,
      },
      title: {
        ...displayTextStyle({ fontWeight: '700' }),
        fontSize: kioskScreenLayout.paymentReferenceTitleSize,
        lineHeight: kioskScreenLayout.paymentReferenceTitleLineHeight,
        color: colors.title,
        textAlign: 'center' as const,
      },
      subtitle: {
        ...bodyTextStyle(),
        fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
        lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
        color: colors.paymentReferenceMuted,
        textAlign: 'center' as const,
        paddingBottom: kioskScreenLayout.paymentOutcomeBlockGap,
      },
    }),
    [colors],
  );

  const notifyCashier = useCallback(() => {
    requestCashierAssistance({
      kioskId: deviceSerial ?? 'KIOSK-UNKNOWN',
      sessionId: ASSISTANCE_SESSION_ID,
      orderId,
      reason,
    });
  }, [deviceSerial, orderId, reason]);

  useEffect(() => {
    notifyCashier();
  }, [notifyCashier]);

  useAssistanceTimeout(Boolean(onTimeout), undefined, () => {
    onTimeout?.();
  });

  return (
    <KioskScreenLayout
      testID="payment-call-cashier-screen"
      showPattern
      contentAlign="center"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={[referenceFlowLayoutStyles.inner, styles.inner]}>
        <IconEngineering
          width={iconSize}
          height={iconSize}
          color={colors.priceAccent}
        />
        <Text style={styles.title}>{t('assistance.title')}</Text>
        <Text style={styles.subtitle}>{t('assistance.subtitle')}</Text>
        {orderId ? (
          <OrderNumberCard orderId={orderId} label={t('assistance.orderLabel')} />
        ) : null}
        <View style={referenceFlowLayoutStyles.errorActions}>
          <PaymentPrimaryCta
            label={t('assistance.callAgainCta')}
            showChevron={false}
            onPress={notifyCashier}
            testID="payment-assistance-call-again"
          />
          <PaymentReferenceOutlineCta
            label={t('assistance.cancelOrderCta')}
            onPress={onCancelOrder}
            testID="payment-assistance-cancel-order"
          />
        </View>
      </View>
    </KioskScreenLayout>
  );
}
