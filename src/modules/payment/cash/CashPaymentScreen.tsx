import { ScrollView, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconCash from '@assets/images/payment/icon-cash.svg';
import {
  OrderNumberCard,
  PaymentFlowHero,
  PaymentPrimaryCta,
  paymentFlowLayoutStyles,
} from '../components';
import { useCashPaymentScreen } from './hooks/useCashPaymentScreen';

export type CashPaymentScreenProps = {
  onBack: () => void;
  onSessionComplete: () => void;
};

/** P10 (d) · Efectivo (Figma 172:266). Tras procesar fiscal + ticket + backend. */
export function CashPaymentScreen({
  onBack,
  onSessionComplete,
}: CashPaymentScreenProps) {
  const colors = useKioskScreenColors();
  const { orderId, copy } = useCashPaymentScreen();

  return (
    <KioskScreenLayout
      testID="payment-cash-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-cash-back"
      contentStyle={paymentFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={paymentFlowLayoutStyles.scrollContent}>
        <View style={paymentFlowLayoutStyles.inner}>
          <PaymentFlowHero
            title={copy.title}
            subtitle={copy.subtitle}
            minHeight={kioskScreenLayout.paymentZelleHeroMinHeight}
            icon={
              <IconCash
                width={kioskScreenLayout.paymentZelleHeroIconWidth}
                height={kioskScreenLayout.paymentZelleHeroIconHeight}
                color={colors.priceAccent}
              />
            }
          />

          {orderId ? (
            <OrderNumberCard orderId={orderId} label={copy.orderLabel} />
          ) : null}

          <PaymentPrimaryCta
            label={copy.backToHome}
            onPress={onSessionComplete}
            testID="payment-cash-back-to-home"
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
