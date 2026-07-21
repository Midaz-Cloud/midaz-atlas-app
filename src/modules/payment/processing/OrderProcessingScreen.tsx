import { View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';

import { PaymentStatusIllustration } from '../components/PaymentStatusIllustration';
import { referenceFlowLayoutStyles } from '../reference/referenceFlowLayout';
import { useOrderProcessing } from './hooks/useOrderProcessing';
import { useOrderProcessingScreen } from './hooks/useOrderProcessingScreen';
import type { ProcessKioskOrderResult } from './types';

export type OrderProcessingScreenProps = {
  onComplete: (result: ProcessKioskOrderResult) => void;
};

/** P13 · Procesando orden (Figma 55:191). */
export function OrderProcessingScreen({ onComplete }: OrderProcessingScreenProps) {
  const { phase } = useOrderProcessing({ enabled: true, onComplete });
  const { title, statusLabel } = useOrderProcessingScreen(phase);

  return (
    <KioskScreenLayout
      testID="payment-order-processing-screen"
      showPattern
      contentAlign="center"
      contentStyle={referenceFlowLayoutStyles.content}>
      <View style={referenceFlowLayoutStyles.inner}>
        <PaymentStatusIllustration
          variant="processing"
          title={title}
          subtitle={statusLabel}
        />
      </View>
    </KioskScreenLayout>
  );
}
