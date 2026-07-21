import { ScrollView, StyleSheet, View } from 'react-native';

import {
  PaymentNumericKeypad,
  PaymentPrimaryCta,
  PaymentReferenceInputCard,
} from '@modules/payment/components';
import { KioskScreenLayout } from '@shared/components';
import { kioskScreenLayout } from '@shared/theme';

import { LocatorFlowHero } from './components/LocatorFlowHero';
import { useLocatorEntryScreen } from './hooks/useLocatorEntryScreen';
import { locatorFlowLayoutStyles } from './locatorFlowLayout';
import { LOCATOR_CODE_LENGTH } from './types';

export type LocatorEntryScreenProps = {
  locatorCode: string;
  onBack: () => void;
  onLocatorCodeChange: (value: string) => void;
  onValidate: () => void;
};

/** P20 · Localizador (Figma 180:187) — antes del pago. */
export function LocatorEntryScreen({
  locatorCode,
  onBack,
  onLocatorCodeChange,
  onValidate,
}: LocatorEntryScreenProps) {
  const { title, subtitle, fieldLabel, validateLabel } = useLocatorEntryScreen();

  const handleDigit = (digit: string) => {
    if (locatorCode.length >= LOCATOR_CODE_LENGTH) {
      return;
    }
    onLocatorCodeChange(locatorCode + digit);
  };

  const handleBackspace = () => {
    onLocatorCodeChange(locatorCode.slice(0, -1));
  };

  const canValidate = locatorCode.length === LOCATOR_CODE_LENGTH;

  return (
    <KioskScreenLayout
      testID="locator-entry-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="locator-entry-back"
      contentStyle={locatorFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={locatorFlowLayoutStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={locatorFlowLayoutStyles.inner}>
          <LocatorFlowHero title={title} subtitle={subtitle} />
          <View style={styles.formBlock}>
            <PaymentReferenceInputCard
              label={fieldLabel}
              value={locatorCode}
              codeLength={LOCATOR_CODE_LENGTH}
            />
            <PaymentNumericKeypad onDigit={handleDigit} onBackspace={handleBackspace} />
            <PaymentPrimaryCta
              label={validateLabel}
              disabled={!canValidate}
              showChevron={false}
              onPress={onValidate}
              testID="locator-entry-validate"
            />
          </View>
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}

const styles = StyleSheet.create({
  formBlock: {
    alignSelf: 'stretch',
    gap: kioskScreenLayout.locatorFormActionsGap,
  },
});
