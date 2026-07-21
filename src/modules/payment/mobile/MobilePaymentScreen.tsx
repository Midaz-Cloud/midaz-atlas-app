import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomerPhoneOperatorSelector } from '@modules/customer/customer-register/components/CustomerPhoneOperatorSelector';
import { KioskScreenLayout } from '@shared/components';
import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { VENEZUELA_SUBSCRIBER_NUMBER_LENGTH } from '@shared/phone/venezuelaPhone';

import IconMobile from '@assets/images/payment/mobile/icon-mobile.svg';
import {
  PaymentFlowHero,
  PaymentPillTextField,
  PaymentPrimaryCta,
  PaymentReferenceOutlineCta,
  paymentFlowLayoutStyles,
} from '../components';
import { REFERENCE_SUFFIX_LENGTH } from '../reference/types';
import { BankSelectorSheet } from './components/BankSelectorSheet';
import { PaymentBankSelectorField } from './components/PaymentBankSelectorField';
import { useKioskBanks } from './hooks/useKioskBanks';
import { useMobilePaymentScreen } from './hooks/useMobilePaymentScreen';
import type { useMobilePaymentPayerForm } from './hooks/useMobilePaymentPayerForm';

export type MobilePaymentScreenProps = {
  payerForm: ReturnType<typeof useMobilePaymentPayerForm>;
  onBack: () => void;
  onValidate: () => void;
  onChangeDocument?: () => void;
};

/** P10 (c) · Confirmar pago móvil (Figma 205:176). */
export function MobilePaymentScreen({
  payerForm,
  onBack,
  onValidate,
  onChangeDocument,
}: MobilePaymentScreenProps) {
  const colors = useKioskScreenColors();
  const { banks, loading: banksLoading } = useKioskBanks();
  const [bankSheetOpen, setBankSheetOpen] = useState(false);

  const {
    title,
    subtitle,
    associatedDocumentLabel,
    referencePlaceholder,
    phonePlaceholder,
    bankPlaceholder,
    continueLabel,
    changeDocumentLabel,
    bankSheetLoading,
  } = useMobilePaymentScreen();

  const {
    selectedBank,
    setSelectedBank,
    reference,
    setReference,
    operatorCode,
    setOperatorCode,
    subscriberNumber,
    setSubscriberNumber,
    canValidate,
  } = payerForm;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        inner: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentMobileConfirmSectionGap,
        },
        documentLine: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentMobileConfirmDocumentSize,
          lineHeight: kioskScreenLayout.paymentMobileConfirmDocumentLineHeight,
          color: colors.title,
          textAlign: 'center',
          alignSelf: 'stretch',
        },
        fields: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentMobileConfirmFieldsGap,
        },
        phoneRow: {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: kioskScreenLayout.customerRegisterNameRowGap,
        },
        phoneOperator: {
          width: kioskScreenLayout.customerPhoneOperatorSelectorWidth,
          flexShrink: 0,
        },
        phoneNumber: {
          flex: 1,
          minWidth: 0,
        },
        actions: {
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentMobileConfirmActionsGap,
        },
      }),
    [colors.title],
  );

  return (
    <KioskScreenLayout
      testID="payment-mobile-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="payment-mobile-back"
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

          {associatedDocumentLabel ? (
            <Text style={styles.documentLine}>{associatedDocumentLabel}</Text>
          ) : null}

          <View style={styles.fields}>
            <PaymentPillTextField
              value={reference}
              onChangeText={(text) =>
                setReference(text.replace(/\D/g, '').slice(0, REFERENCE_SUFFIX_LENGTH))
              }
              placeholder={referencePlaceholder}
              keyboardType="number-pad"
              maxLength={REFERENCE_SUFFIX_LENGTH}
              textAlign="left"
              testID="payment-mobile-reference"
            />

            <View style={styles.phoneRow}>
              <View style={styles.phoneOperator}>
                <CustomerPhoneOperatorSelector
                  value={operatorCode}
                  onChange={setOperatorCode}
                />
              </View>
              <View style={styles.phoneNumber}>
                <PaymentPillTextField
                  value={subscriberNumber}
                  onChangeText={(text) =>
                    setSubscriberNumber(
                      text.replace(/\D/g, '').slice(0, VENEZUELA_SUBSCRIBER_NUMBER_LENGTH),
                    )
                  }
                  placeholder={phonePlaceholder}
                  keyboardType="number-pad"
                  maxLength={VENEZUELA_SUBSCRIBER_NUMBER_LENGTH}
                  textAlign="left"
                  testID="payment-mobile-payer-phone"
                />
              </View>
            </View>

            <PaymentBankSelectorField
              pill
              label={bankPlaceholder}
              placeholder={
                banksLoading ? bankSheetLoading : bankPlaceholder
              }
              selectedBank={selectedBank}
              onPress={() => setBankSheetOpen(true)}
              testID="payment-mobile-origin-bank"
            />
          </View>

          <View style={styles.actions}>
            <PaymentPrimaryCta
              label={continueLabel}
              disabled={!canValidate || banksLoading || banks.length === 0}
              onPress={onValidate}
              testID="payment-mobile-validate"
            />
            {onChangeDocument ? (
              <PaymentReferenceOutlineCta
                label={changeDocumentLabel}
                onPress={onChangeDocument}
                testID="payment-mobile-change-document"
              />
            ) : null}
          </View>
        </View>
      </ScrollView>

      <BankSelectorSheet
        visible={bankSheetOpen}
        banks={banks}
        selectedCode={selectedBank?.code}
        onClose={() => setBankSheetOpen(false)}
        onSelect={setSelectedBank}
      />
    </KioskScreenLayout>
  );
}
