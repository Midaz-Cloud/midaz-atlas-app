import { ScrollView, View } from 'react-native';

import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';

import {
  PaymentFlowHero,
  PaymentNumericKeypad,
  PaymentPrimaryCta,
  PaymentReferenceInputCard,
} from '../components';
import { PaymentReferenceMethodIcon } from '../components/PaymentReferenceMethodIcon';
import { useReferenceEntryScreen } from './hooks/useReferenceEntryScreen';
import { REFERENCE_SUFFIX_LENGTH } from './types';
import { referenceFlowLayoutStyles } from './referenceFlowLayout';
import type { TransferPaymentMethodId } from '../types';

export type ReferenceEntryScreenProps = {
  methodId: TransferPaymentMethodId;
  reference: string;
  onBack: () => void;
  onReferenceChange: (value: string) => void;
  onValidate: () => void;
};

/** P11 · Ingresar referencia (Figma 51:2). */
export function ReferenceEntryScreen({
  methodId,
  reference,
  onBack,
  onReferenceChange,
  onValidate,
}: ReferenceEntryScreenProps) {
  const { title, subtitle, fieldLabel, validateLabel } = useReferenceEntryScreen();

  const handleDigit = (digit: string) => {
    if (reference.length >= REFERENCE_SUFFIX_LENGTH) {
      return;
    }
    onReferenceChange(reference + digit);
  };

  const handleBackspace = () => {
    onReferenceChange(reference.slice(0, -1));
  };

  const canValidate = reference.length === REFERENCE_SUFFIX_LENGTH;

  return (
    <KioskScreenLayout
      testID="payment-reference-entry-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-reference-entry-back"
      contentStyle={referenceFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={referenceFlowLayoutStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={referenceFlowLayoutStyles.inner}>
          <PaymentFlowHero
            title={title}
            subtitle={subtitle}
            minHeight={kioskScreenLayout.paymentReferenceHeroMinHeight}
            icon={<PaymentReferenceMethodIcon methodId={methodId} />}
          />
          <PaymentReferenceInputCard label={fieldLabel} value={reference} />
          <PaymentNumericKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
          <PaymentPrimaryCta
            label={validateLabel}
            disabled={!canValidate}
            onPress={onValidate}
            testID="payment-reference-validate"
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
