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
  /** La impresora fiscal no estaba lista: no se cobró nada. */
  fiscalUnavailable?: boolean;
  /**
   * El POS no confirmó el cobro (`unconfirmed`) o no lo ejecutó porque el anterior
   * sigue pendiente (`previous_pending`). No se ofrece reintentar ni cambiar de método:
   * podría cobrarse dos veces. El cliente acude al personal.
   */
  posUncertain?: 'unconfirmed' | 'previous_pending';
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
  fiscalUnavailable = false,
  posUncertain,
  retryCount,
  onBack,
  onRetry,
  onChangeMethod,
}: PaymentErrorScreenProps) {
  const { t } = useTranslation('payment');
  const colors = useKioskScreenColors();

  const isBlocked = orderRegistrationFailed && retryCount != null && retryCount >= 3;
  const posUncertainKey =
    posUncertain === 'unconfirmed'
      ? 'error.posUnconfirmed'
      : posUncertain === 'previous_pending'
        ? 'error.posPreviousPending'
        : null;

  const titleLine1 = posUncertainKey
    ? t(`${posUncertainKey}.titleLine1`)
    : fiscalUnavailable
    ? t('error.fiscalUnavailable.titleLine1')
    : orderRegistrationFailed
      ? t('error.orderRegistrationFailed.titleLine1')
      : t('error.titleLine1');
  const titleLine2 = posUncertainKey
    ? t(`${posUncertainKey}.titleLine2`)
    : fiscalUnavailable
    ? t('error.fiscalUnavailable.titleLine2')
    : orderRegistrationFailed
      ? t('error.orderRegistrationFailed.titleLine2')
      : t('error.titleLine2');
  const subtitle = posUncertainKey
    ? t(`${posUncertainKey}.subtitle`)
    : fiscalUnavailable
    ? t('error.fiscalUnavailable.subtitle')
    : isBlocked
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
            posUncertainKey ? (
              <View style={referenceFlowLayoutStyles.errorActions}>
                <PaymentPrimaryCta
                  label={t(`${posUncertainKey}.okCta`)}
                  showChevron={false}
                  onPress={onBack}
                  testID="payment-error-pos-uncertain-ok"
                />
              </View>
            ) : (
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
            )
          }
        />
      </View>
    </KioskScreenLayout>
  );
}
