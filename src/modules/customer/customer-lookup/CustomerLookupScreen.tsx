import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PaymentFlowHero, PaymentNumericKeypad, PaymentPrimaryCta } from '@modules/payment/components';
import { KioskScreenLayout } from '@shared/components';
import type { CustomerDocumentType, CustomerRegisterPrefill } from '@shared/api/kiosk';
import {
  composeDocumentId,
  getDocumentNumberMaxLength,
  lookupCustomerByDocument,
  normalizeDocumentId,
  parseDocumentId,
} from '@shared/api/kiosk';
import { useKioskCustomer } from '@shared/customer';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import type { CustomerLookupStatus } from '../customer-register/components/CustomerLookupStatusBanner';
import { buildCustomerLookupStatus } from '../customerLookupStatus';

import { CustomerBillingHeroIcon } from '../components/CustomerBillingHeroIcon';
import { CustomerDocumentField } from './components/CustomerDocumentField';
import { useCustomerLookupScreen } from './hooks/useCustomerLookupScreen';
import { customerFlowLayoutStyles } from '../theme/customerFlowLayout';

export type CustomerLookupScreenProps = {
  initialDocumentId?: string;
  onBack: () => void;
  onCustomerReady: () => void;
  onRegisterRequired: (
    documentId: string,
    options?: { lookupStatus: CustomerLookupStatus; prefill?: CustomerRegisterPrefill },
  ) => void;
};

export function CustomerLookupScreen({
  initialDocumentId = '',
  onBack,
  onCustomerReady,
  onRegisterRequired,
}: CustomerLookupScreenProps) {
  const copy = useCustomerLookupScreen();
  const { setCustomer } = useKioskCustomer();
  const colors = useKioskScreenColors();
  const initialParsed = useMemo(
    () => parseDocumentId(initialDocumentId),
    [initialDocumentId],
  );
  const [documentType, setDocumentType] = useState<CustomerDocumentType>(initialParsed.type);
  const [documentNumber, setDocumentNumber] = useState(initialParsed.number);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const fullDocumentId = composeDocumentId(documentType, documentNumber);
  const maxNumberLength = getDocumentNumberMaxLength(documentType);
  const canContinue = documentNumber.trim().length > 0 && !isLoading;

  const handleDigit = useCallback(
    (digit: string) => {
      setErrorMessage(undefined);
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
    setErrorMessage(undefined);
    setDocumentNumber((current) => current.slice(0, -1));
  }, []);

  const handleTypeChange = useCallback((type: CustomerDocumentType) => {
    setErrorMessage(undefined);
    setDocumentType(type);
    const maxLength = getDocumentNumberMaxLength(type);
    setDocumentNumber((current) => current.slice(0, maxLength));
  }, []);

  const handleContinue = useCallback(async () => {
    if (documentNumber.trim().length === 0) {
      return;
    }

    const documentId = normalizeDocumentId(fullDocumentId);

    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await lookupCustomerByDocument(documentId);
    setIsLoading(false);

    if (result.status === 'found') {
      setCustomer(result.customer);
      onCustomerReady();
      return;
    }
    if (result.status === 'register') {
      onRegisterRequired(documentId, {
        lookupStatus: buildCustomerLookupStatus(result),
        prefill: result.prefill,
      });
      return;
    }
    if (result.status === 'not_found') {
      onRegisterRequired(documentId, {
        lookupStatus: buildCustomerLookupStatus(result),
      });
      return;
    }
    onRegisterRequired(documentId, {
      lookupStatus: buildCustomerLookupStatus({
        ...result,
        message: result.message || copy.errorNetwork,
      }),
    });
  }, [
    copy.errorNetwork,
    documentNumber,
    fullDocumentId,
    onCustomerReady,
    onRegisterRequired,
    setCustomer,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        errorText: {
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.modifiersSubtitleSize,
          lineHeight: kioskScreenLayout.modifiersSubtitleLineHeight,
          color: colors.priceAccent,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="customer-lookup-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="customer-lookup-back"
      contentStyle={customerFlowLayoutStyles.content}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={customerFlowLayoutStyles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={customerFlowLayoutStyles.inner}>
          <PaymentFlowHero
            title={copy.title}
            subtitle={copy.subtitle}
            minHeight={kioskScreenLayout.paymentReferenceHeroMinHeight}
            icon={<CustomerBillingHeroIcon />}
          />
          <CustomerDocumentField
            label={copy.documentLabel}
            documentType={documentType}
            documentNumber={documentNumber}
            onTypeChange={handleTypeChange}
          />
          {errorMessage ? (
            <Text style={styles.errorText} testID="customer-lookup-error">
              {errorMessage}
            </Text>
          ) : null}
          <PaymentNumericKeypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            accentBackspace
          />
          <PaymentPrimaryCta
            label={isLoading ? copy.loadingLabel : copy.continueLabel}
            disabled={!canContinue}
            onPress={() => void handleContinue()}
            testID="customer-lookup-continue"
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
