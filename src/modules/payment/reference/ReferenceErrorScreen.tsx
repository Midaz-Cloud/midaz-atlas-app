import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import {
  PaymentPrimaryCta,
  PaymentReferenceOutlineCta,
  PaymentStatusIllustration,
} from '../components';
import { referenceFlowLayoutStyles } from './referenceFlowLayout';
import { resolveReferenceErrorTitleKind } from './resolveReferenceErrorTitle';

export type ReferenceErrorScreenProps = {
  blocked: boolean;
  /**
   * Raw API message — used only to detect "Pago ya conciliado previamente".
   * Not shown on screen (backend `message` is not used as copy for now).
   */
  message?: string;
  onBack: () => void;
  onRetry: () => void;
  onRequestHelp: () => void;
};

/** P12.1 · Referencia inválida (Figma 52:121). */
export function ReferenceErrorScreen({
  blocked,
  message,
  onBack,
  onRetry,
  onRequestHelp,
}: ReferenceErrorScreenProps) {
  const { t } = useTranslation('payment');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () => ({
      blocked: {
        ...bodyTextStyle(),
        fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
        lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
        color: colors.paymentReferenceMuted,
        textAlign: 'center' as const,
      },
    }),
    [colors],
  );

  const titleKind = resolveReferenceErrorTitleKind(message);
  const title =
    titleKind === 'already_reconciled'
      ? t('reference.error.alreadyReconciledTitle')
      : t('reference.error.title');

  return (
    <KioskScreenLayout
      testID="payment-reference-error-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-reference-error-back"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={referenceFlowLayoutStyles.inner}>
        <PaymentStatusIllustration
          variant="error"
          title={title}
          subtitle={t('reference.error.subtitle')}
          footer={
            <View style={referenceFlowLayoutStyles.errorActions}>
              {blocked ? (
                <Text style={styles.blocked}>{t('reference.error.blockedMessage')}</Text>
              ) : null}
              <PaymentPrimaryCta
                label={t('reference.error.retry')}
                disabled={blocked}
                showChevron={false}
                onPress={onRetry}
                testID="payment-reference-retry"
              />
              <PaymentReferenceOutlineCta
                label={t('reference.error.help')}
                onPress={onRequestHelp}
              />
            </View>
          }
        />
      </View>
    </KioskScreenLayout>
  );
}
