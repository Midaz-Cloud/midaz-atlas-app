import { ScrollView, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';

import IconZelle from '@assets/images/payment/zelle/icon-zelle-hero.svg';
import {
  PaymentAccountDetailsPanel,
  PaymentFlowHero,
  PaymentPrimaryCta,
  PaymentTotalBanner,
  paymentFlowLayoutStyles,
} from '../components';
import { useZellePaymentScreen } from './hooks/useZellePaymentScreen';

export type ZellePaymentScreenProps = {
  onBack: () => void;
  onContinue: () => void;
};

/** P10 (c) · Zelle (Figma 48:66). */
export function ZellePaymentScreen({ onBack, onContinue }: ZellePaymentScreenProps) {
  const { title, subtitle, fields, totalLabel, continueLabel, totalVes } =
    useZellePaymentScreen();

  return (
    <KioskScreenLayout
      testID="payment-zelle-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-zelle-back"
      contentStyle={paymentFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={paymentFlowLayoutStyles.scrollContent}>
        <View style={paymentFlowLayoutStyles.inner}>
          <PaymentFlowHero
            title={title}
            subtitle={subtitle}
            minHeight={kioskScreenLayout.paymentZelleHeroMinHeight}
            icon={
              <IconZelle
                width={kioskScreenLayout.paymentZelleHeroIconWidth}
                height={kioskScreenLayout.paymentZelleHeroIconHeight}
              />
            }
          />

          <PaymentAccountDetailsPanel fields={fields} testID="payment-zelle-details" />

          <PaymentTotalBanner label={totalLabel} totalVes={totalVes} />

          <PaymentPrimaryCta
            label={continueLabel}
            onPress={onContinue}
            testID="payment-zelle-continue"
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
