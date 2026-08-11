import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { showKioskDevUi } from '@shared/config';
import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconCard from '@assets/images/payment/pos/icon-card.svg';
import {
  PaymentFlowHero,
  PaymentPrimaryCta,
  PaymentReferenceOutlineCta,
  PaymentTotalBanner,
  paymentFlowLayoutStyles,
} from '../components';
import { PaymentPosSyncStatus } from './components/PaymentPosSyncStatus';
import { usePosPaymentScreen } from './hooks';

export type PosPaymentScreenProps = {
  onBack: () => void;
  onContinue: () => void;
  onChangeDocument?: () => void;
  showSyncStatus?: boolean;
};

/** P10 (a) · POS / ECR (Figma 47:2). */
export function PosPaymentScreen({
  onBack,
  onContinue,
  onChangeDocument,
  showSyncStatus = true,
}: PosPaymentScreenProps) {
  const colors = useKioskScreenColors();
  const {
    title,
    subtitle,
    totalLabel,
    continueLabel,
    syncingLabel,
    totalVes,
    testChargeBanner,
    associatedDocumentLabel,
    changeDocumentLabel,
    posReady,
    isProcessing,
  } = usePosPaymentScreen();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentPosSectionGap,
        },
        documentLine: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentPosSubtitleSize,
          lineHeight: kioskScreenLayout.paymentPosSubtitleLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'center',
          alignSelf: 'stretch',
        },
        testBanner: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentPosSubtitleSize,
          lineHeight: kioskScreenLayout.paymentPosSubtitleLineHeight,
          color: colors.priceAccent,
          textAlign: 'center',
          fontWeight: '600',
        },
        actions: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentMobileConfirmActionsGap,
        },
        secondaryBlock: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentPosActionsGap,
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="payment-pos-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-pos-back"
      contentStyle={paymentFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={paymentFlowLayoutStyles.scrollContent}>
        <View style={styles.inner}>
          <PaymentFlowHero
            title={title}
            subtitle={subtitle}
            minHeight={kioskScreenLayout.paymentPosHeroMinHeight}
            icon={
              <IconCard
                width={kioskScreenLayout.paymentPosHeroIconWidth}
                height={kioskScreenLayout.paymentPosHeroIconHeight}
                color={colors.title}
              />
            }
          />

          <PaymentTotalBanner label={totalLabel} totalVes={totalVes} />

          {associatedDocumentLabel ? (
            <Text style={styles.documentLine} testID="payment-pos-associated-document">
              {associatedDocumentLabel}
            </Text>
          ) : null}

          {showKioskDevUi() && testChargeBanner ? (
            <Text style={styles.testBanner}>{testChargeBanner}</Text>
          ) : null}

          <View style={styles.actions}>
            <PaymentPrimaryCta
              label={continueLabel}
              onPress={onContinue}
              disabled={!posReady || isProcessing}
              testID="payment-pos-continue"
            />

            <View style={styles.secondaryBlock}>
              {onChangeDocument ? (
                <PaymentReferenceOutlineCta
                  label={changeDocumentLabel}
                  onPress={onChangeDocument}
                  testID="payment-pos-change-document"
                />
              ) : null}
              {showSyncStatus ? <PaymentPosSyncStatus message={syncingLabel} /> : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
