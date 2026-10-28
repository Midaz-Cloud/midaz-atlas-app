import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { useKioskInactivity } from '@shared/inactivity';
import { useEcrConnection } from '@shared/peripherals/ecr';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { referenceFlowLayoutStyles } from '../reference/referenceFlowLayout';
import { PosTapCardIllustration } from './components/PosTapCardIllustration';
import { usePosChargeCountdown } from './hooks/usePosChargeCountdown';
import { usePosChargeProcessing } from './hooks/usePosChargeProcessing';
import type { PosChargeResult } from './types';

export type PosChargeProcessingScreenProps = {
  onComplete: (result: PosChargeResult) => void;
};

/** Dedicated POS charge wait screen: tap illustration + waiting_pos / confirming + mm:ss. */
export function PosChargeProcessingScreen({
  onComplete,
}: PosChargeProcessingScreenProps) {
  const { t } = useTranslation('payment');
  const colors = useKioskScreenColors();
  const { phase } = usePosChargeProcessing({ enabled: true, onComplete });
  const { display: countdownDisplay } = usePosChargeCountdown(phase);
  // El POS puede tardar ~3,5 min si queda sin respuesta y se le pregunta con resend:
  // el aviso de inactividad no puede cortar un cobro en curso.
  const { pauseInactivity, resumeInactivity } = useKioskInactivity();
  const { isConfirmingPosResult } = useEcrConnection();

  useEffect(() => {
    pauseInactivity();
    return resumeInactivity;
  }, [pauseInactivity, resumeInactivity]);

  const statusLabel = isConfirmingPosResult
    ? t('posCharge.confirmingResult')
    : phase === 'confirming'
      ? t('posCharge.confirming')
      : t('posCharge.waitingPos');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScale(20),
          paddingHorizontal: kioskScale(40),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScreenLayout.paymentReferenceTitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceTitleLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        status: {
          ...bodyTextStyle(),
          fontSize: kioskScale(28),
          lineHeight: kioskScale(36),
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        timer: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(56),
          lineHeight: kioskScale(64),
          color: colors.priceAccent,
          textAlign: 'center',
          letterSpacing: kioskScale(2),
          fontVariant: ['tabular-nums'],
        },
        timerHint: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          lineHeight: kioskScale(28),
          color: colors.menuSectionMuted,
          textAlign: 'center',
          marginTop: kioskScale(-8),
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="payment-pos-charge-processing-screen"
      showPattern
      contentAlign="center"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={[referenceFlowLayoutStyles.inner, styles.center]}>
        <PosTapCardIllustration
          instruction={isConfirmingPosResult ? t('posCharge.stayHint') : t('posCharge.tapCardHint')}
        />
        <Text style={styles.title} testID="payment-pos-charge-title">
          {t('posCharge.title')}
        </Text>
        <Text style={styles.status} testID="payment-pos-charge-status">
          {statusLabel}
        </Text>
        {isConfirmingPosResult ? null : (
          <>
            <Text style={styles.timer} testID="payment-pos-charge-timer">
              {countdownDisplay}
            </Text>
            <Text style={styles.timerHint} testID="payment-pos-charge-timer-hint">
              {t('posCharge.timeRemainingHint')}
            </Text>
          </>
        )}
      </View>
    </KioskScreenLayout>
  );
}
