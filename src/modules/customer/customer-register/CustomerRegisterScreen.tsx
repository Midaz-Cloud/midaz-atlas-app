import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { PaymentFlowHero } from '@modules/payment/components';
import { KioskScreenLayout } from '@shared/components';
import { registerKioskCustomer, parseDocumentId, type CustomerRegisterPrefill } from '@shared/api/kiosk';
import { useKioskCustomer } from '@shared/customer';
import type { VenezuelaMobileOperatorCode } from '@shared/phone';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import { CustomerBillingHeroIcon } from '../components/CustomerBillingHeroIcon';
import { CustomerRegisterActions } from './components/CustomerRegisterActions';
import { CustomerRegisterForm } from './components/CustomerRegisterForm';
import {
  CustomerLookupStatusBanner,
  type CustomerLookupStatus,
} from './components/CustomerLookupStatusBanner';
import { useCustomerRegisterScreen } from './hooks/useCustomerRegisterScreen';
import { initialRegisterFormFromPrefill } from './registerPrefill';
import { composeRegisterPhone, isRegisterFormValid } from './validation';
import { customerFlowLayoutStyles } from '../theme/customerFlowLayout';

export type CustomerRegisterScreenProps = {
  documentId: string;
  lookupStatus?: CustomerLookupStatus;
  prefill?: CustomerRegisterPrefill;
  onBack: () => void;
  onCustomerReady: () => void;
};

export function CustomerRegisterScreen({
  documentId,
  lookupStatus,
  prefill,
  onBack,
  onCustomerReady,
}: CustomerRegisterScreenProps) {
  const copy = useCustomerRegisterScreen(documentId);
  const { setCustomer } = useKioskCustomer();
  const colors = useKioskScreenColors();
  const documentType = useMemo(() => parseDocumentId(documentId).type, [documentId]);
  const initialForm = useMemo(
    () => initialRegisterFormFromPrefill(documentId, prefill),
    [documentId, prefill],
  );
  const [firstName, setFirstName] = useState(initialForm.firstName ?? '');
  const [lastName, setLastName] = useState(initialForm.lastName ?? '');
  const [phoneOperatorCode, setPhoneOperatorCode] = useState<VenezuelaMobileOperatorCode>(
    initialForm.phoneOperatorCode,
  );
  const [phoneSubscriberNumber, setPhoneSubscriberNumber] = useState(
    initialForm.phoneSubscriberNumber ?? '',
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phone = useMemo(
    () => composeRegisterPhone(phoneOperatorCode, phoneSubscriberNumber),
    [phoneOperatorCode, phoneSubscriberNumber],
  );

  const validationInput = useMemo(
    () => ({
      documentType,
      firstName,
      lastName: copy.isJuridico ? '' : lastName,
      phoneOperatorCode,
      phoneSubscriberNumber,
    }),
    [copy.isJuridico, documentType, firstName, lastName, phoneOperatorCode, phoneSubscriberNumber],
  );

  const canSubmit = isRegisterFormValid(validationInput) && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!isRegisterFormValid(validationInput)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    const result = await registerKioskCustomer({
      documentId,
      firstName,
      lastName: copy.isJuridico ? '' : lastName,
      phone,
    });
    setIsSubmitting(false);

    if (result.status === 'ok') {
      setCustomer(result.customer);
      onCustomerReady();
      return;
    }
    setErrorMessage(result.message || copy.errorRegisterFailed);
  }, [
    copy.errorRegisterFailed,
    copy.isJuridico,
    documentId,
    firstName,
    lastName,
    onCustomerReady,
    phone,
    setCustomer,
    validationInput,
  ]);

  const errorTextStyle = useMemo(
    () => ({
      alignSelf: 'stretch' as const,
      fontSize: kioskScreenLayout.modifiersSubtitleSize,
      lineHeight: kioskScreenLayout.modifiersSubtitleLineHeight,
      color: colors.priceAccent,
      textAlign: 'center' as const,
    }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="customer-register-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="customer-register-header-back"
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
          {lookupStatus ? (
            <CustomerLookupStatusBanner status={lookupStatus} documentId={documentId} />
          ) : null}
          <CustomerRegisterForm
            isJuridico={copy.isJuridico}
            firstName={firstName}
            lastName={lastName}
            phoneOperatorCode={phoneOperatorCode}
            phoneSubscriberNumber={phoneSubscriberNumber}
            firstNameLabel={copy.firstNameLabel}
            lastNameLabel={copy.lastNameLabel}
            businessNameLabel={copy.businessNameLabel}
            phoneSubscriberPlaceholder={copy.phoneSubscriberPlaceholder}
            onFirstNameChange={(value) => {
              setErrorMessage(undefined);
              setFirstName(value);
            }}
            onLastNameChange={(value) => {
              setErrorMessage(undefined);
              setLastName(value);
            }}
            onPhoneOperatorChange={(code) => {
              setErrorMessage(undefined);
              setPhoneOperatorCode(code);
            }}
            onPhoneSubscriberChange={(value) => {
              setErrorMessage(undefined);
              setPhoneSubscriberNumber(value);
            }}
          />
          {errorMessage ? (
            <Text
              style={errorTextStyle}
              testID="customer-register-error">
              {errorMessage}
            </Text>
          ) : null}
          <CustomerRegisterActions
            submitLabel={copy.submitLabel}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSubmit={() => void handleSubmit()}
          />
        </View>
      </ScrollView>
    </KioskScreenLayout>
  );
}
