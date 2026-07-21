import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CustomerDocumentField } from '@modules/customer/customer-lookup/components/CustomerDocumentField';
import { KioskScreenLayout } from '@shared/components';
import type { CustomerDocumentType } from '@shared/api/kiosk';
import {
  composeDocumentId,
  getDocumentNumberMaxLength,
  isValidDocumentId,
  normalizeDocumentId,
  parseDocumentId,
} from '@shared/api/kiosk';
import { kioskScreenLayout } from '@shared/theme';

import { PaymentChangeDocumentHeroIcon } from './components/PaymentChangeDocumentHeroIcon';
import {
  PaymentFlowHero,
  PaymentNumericKeypad,
  PaymentPrimaryCta,
  paymentFlowLayoutStyles,
} from './components';
import { usePaymentChangeDocumentScreen } from './hooks/usePaymentChangeDocumentScreen';

export type PaymentChangeDocumentScreenProps = {
  initialDocumentId: string;
  onBack: () => void;
  onContinue: (documentId: string) => void;
  testIdPrefix?: string;
};

/** P10 (d) · Nueva cédula del pagador — POS y pago móvil (Figma 205:390). */
export function PaymentChangeDocumentScreen({
  initialDocumentId,
  onBack,
  onContinue,
  testIdPrefix = 'payment-change-document',
}: PaymentChangeDocumentScreenProps) {
  const copy = usePaymentChangeDocumentScreen();
  const initialParsed = useMemo(
    () => parseDocumentId(initialDocumentId),
    [initialDocumentId],
  );
  const [documentType, setDocumentType] = useState<CustomerDocumentType>(initialParsed.type);
  const [documentNumber, setDocumentNumber] = useState(initialParsed.number);

  const fullDocumentId = composeDocumentId(documentType, documentNumber);
  const maxNumberLength = getDocumentNumberMaxLength(documentType);
  const canContinue =
    documentNumber.trim().length > 0 && isValidDocumentId(fullDocumentId);

  const handleDigit = useCallback(
    (digit: string) => {
      setDocumentNumber((current) => {
        if (current.length >= maxNumberLength) {
          return current;
        }
        return current + digit;
      });
    },
    [maxNumberLength],
  );

  const handleBackspace = useCallback(() => {
    setDocumentNumber((current) => current.slice(0, -1));
  }, []);

  const handleTypeChange = useCallback((type: CustomerDocumentType) => {
    setDocumentType(type);
    const maxLength = getDocumentNumberMaxLength(type);
    setDocumentNumber((current) => current.slice(0, maxLength));
  }, []);

  const handleContinue = useCallback(() => {
    if (!canContinue) {
      return;
    }
    onContinue(normalizeDocumentId(fullDocumentId));
  }, [canContinue, fullDocumentId, onContinue]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentMobileChangeDocumentSectionGap,
        },
        documentWrap: {
          alignSelf: 'center',
          width: '100%',
          maxWidth: kioskScreenLayout.paymentReferenceMaxWidth,
        },
      }),
    [],
  );

  return (
    <KioskScreenLayout
      testID={`${testIdPrefix}-screen`}
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID={`${testIdPrefix}-back`}
      contentStyle={paymentFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={paymentFlowLayoutStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <PaymentFlowHero
            title={copy.title}
            subtitle={copy.subtitle}
            minHeight={kioskScreenLayout.paymentMobileChangeDocumentHeroMinHeight}
            icon={<PaymentChangeDocumentHeroIcon />}
          />

          <View style={styles.documentWrap}>
            <CustomerDocumentField
              label={copy.documentLabel}
              documentType={documentType}
              documentNumber={documentNumber}
              onTypeChange={handleTypeChange}
            />
          </View>

          <PaymentNumericKeypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            accentBackspace
          />

          <PaymentPrimaryCta
            label={copy.continueLabel}
            disabled={!canContinue}
            onPress={handleContinue}
            testID={`${testIdPrefix}-continue`}
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
