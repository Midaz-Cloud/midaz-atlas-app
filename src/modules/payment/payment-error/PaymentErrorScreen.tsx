import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import {
  PaymentPrimaryCta,
  PaymentReferenceOutlineCta,
  PaymentStatusIllustration,
} from '../components';
import { referenceFlowLayoutStyles } from '../reference/referenceFlowLayout';
import type { PaymentMethodId } from '../types';

export type PaymentErrorScreenProps = {
  methodId: PaymentMethodId;
  /** Terminal approved charge but POST /kiosk/orders failed. */
  orderRegistrationFailed?: boolean;
  posReference?: string;
  retryCount?: number;
  onBack: () => void;
  onRetry: () => void;
  onChangeMethod: () => void;
};

/** P18 · Error de pago (Figma 66:89). */
export function PaymentErrorScreen({
  methodId: _methodId,
  orderRegistrationFailed = false,
  posReference,
  retryCount,
  onBack,
  onRetry,
  onChangeMethod,
}: PaymentErrorScreenProps) {
  const { t } = useTranslation('payment');
  const colors = useKioskScreenColors();

  const isBlocked = orderRegistrationFailed && retryCount != null && retryCount >= 3;

  const titleLine1 = orderRegistrationFailed
    ? t('error.orderRegistrationFailed.titleLine1')
    : t('error.titleLine1');
  const titleLine2 = orderRegistrationFailed
    ? t('error.orderRegistrationFailed.titleLine2')
    : t('error.titleLine2');
  const subtitle = isBlocked
    ? t('error.orderRegistrationFailed.blockedMessage')
    : orderRegistrationFailed
      ? t('error.orderRegistrationFailed.subtitle', {
          reference: posReference ?? '',
        })
      : t('error.subtitle');

  const styles = useMemo(
    () => ({
      titleBlock: {
        alignItems: 'center' as const,
        gap: kioskScreenLayout.paymentReferenceStatusCenterGap,
      },
      subtitle: {
        ...bodyTextStyle(),
        fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
        lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
        color: colors.paymentReferenceMuted,
        textAlign: 'center' as const,
      },
      titleLine: {
        ...displayTextStyle({ fontWeight: '700' }),
        fontSize: kioskScreenLayout.paymentReferenceTitleSize,
        lineHeight: kioskScreenLayout.paymentOutcomeQrTitleLineHeight,
        color: colors.title,
        textAlign: 'center' as const,
      },
    }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="payment-error-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-error-back"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={referenceFlowLayoutStyles.inner}>
        <PaymentStatusIllustration
          variant="error"
          title={titleLine1}
          subtitleContent={
            <View style={styles.titleBlock}>
              <Text style={styles.titleLine}>{titleLine2}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          }
          footer={
            <View style={referenceFlowLayoutStyles.errorActions}>
              <PaymentPrimaryCta
                label={orderRegistrationFailed ? t('error.orderRegistrationFailed.retryCta') : t('error.retryCta')}
                showChevron={false}
                disabled={isBlocked}
                onPress={onRetry}
                testID="payment-error-retry"
              />
              <PaymentReferenceOutlineCta
                label={orderRegistrationFailed ? t('error.orderRegistrationFailed.helpCta') : t('error.changeMethodCta')}
                onPress={onChangeMethod}
                testID="payment-error-change-method"
              />
            </View>
          }
        />
      </View>
    </KioskScreenLayout>
  );
}
