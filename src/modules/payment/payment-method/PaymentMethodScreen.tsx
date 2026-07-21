import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';

import type { PaymentMethodId } from '../types';
import { PaymentMethodCard } from './components';
import { usePaymentMethodScreen } from './hooks/usePaymentMethodScreen';

export type PaymentMethodScreenProps = {
  onBack: () => void;
  onSelectMethod: (methodId: PaymentMethodId) => void;
};

/** P9 · Selección de método de pago (Figma 43:155). */
export function PaymentMethodScreen({ onBack, onSelectMethod }: PaymentMethodScreenProps) {
  const { t } = useTranslation('payment');
  const { methods, methodLabels, selectedMethodId, handleSelect } =
    usePaymentMethodScreen(onSelectMethod);

  return (
    <KioskScreenLayout
      testID="payment-method-select"
      showPattern
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="payment-method-back"
      title={t('methodSelect.title')}
      subtitle={t('methodSelect.subtitle')}
      contentStyle={styles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.list}>
          {methods.map((method) => {
            const labels = methodLabels[method.id];
            return (
              <PaymentMethodCard
                key={method.id}
                methodId={method.id}
                title={labels.title}
                description={labels.description}
                selected={selectedMethodId === method.id}
                onPress={() => handleSelect(method.id)}
              />
            );
          })}
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: kioskScreenLayout.headerPaddingVertical,
  },
  list: {
    gap: kioskScreenLayout.paymentMethodListGap,
  },
});
