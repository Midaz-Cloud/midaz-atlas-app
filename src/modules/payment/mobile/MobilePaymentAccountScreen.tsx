import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';
import {
  PaymentFlowHero,
  PaymentMobileDetails,
  PaymentPrimaryCta,
  PaymentTotalBanner,
  paymentFlowLayoutStyles,
} from '../components';
import { useMobilePaymentAccountScreen } from './hooks/useMobilePaymentAccountScreen';

export type MobilePaymentAccountScreenProps = {
  onBack: () => void;
  onContinue: () => void;
};

/** P10 (b) · Pago móvil y QR — cuenta destino (Figma 48:2). */
export function MobilePaymentAccountScreen({
  onBack,
  onContinue,
}: MobilePaymentAccountScreenProps) {
  const colors = useKioskScreenColors();
  const {
    title,
    subtitle,
    bankLabel,
    phoneLabel,
    rifLabel,
    bank,
    phone,
    rif,
    totalLabel,
    continueLabel,
    totalVes,
    hasAccountDetails,
    qrCodeUri,
    loadingQr,
  } = useMobilePaymentAccountScreen();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentPosSectionGap,
        },
      }),
    [],
  );

  return (
    <KioskScreenLayout
      testID="payment-mobile-account-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-mobile-account-back"
      contentStyle={paymentFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={paymentFlowLayoutStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <PaymentFlowHero
            title={title}
            subtitle={subtitle}
            minHeight={kioskScreenLayout.paymentMobileHeroMinHeight}
            icon={
              <IconMobile
                width={kioskScreenLayout.paymentPosHeroIconWidth}
                height={kioskScreenLayout.paymentMobileHeroIconHeight}
                color={colors.title}
              />
            }
          />

          <PaymentMobileDetails
            bankLabel={bankLabel}
            bank={bank}
            phoneLabel={phoneLabel}
            phone={phone}
            rifLabel={rifLabel}
            rif={rif}
            qrCodeUri={qrCodeUri}
            loadingQr={loadingQr}
          />

          <PaymentTotalBanner label={totalLabel} totalVes={totalVes} />

          <PaymentPrimaryCta
            label={continueLabel}
            disabled={!hasAccountDetails}
            onPress={onContinue}
            testID="payment-mobile-account-continue"
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
