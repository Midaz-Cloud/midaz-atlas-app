import { View } from 'react-native';

import type { VenezuelaMobileOperatorCode } from '@shared/phone';

import { customerFlowLayoutStyles } from '../../theme/customerFlowLayout';
import { CUSTOMER_EMAIL_MAX_LENGTH } from '../validation';
import { CustomerPhoneField } from './CustomerPhoneField';
import { CustomerTextField } from './CustomerTextField';

export type CustomerRegisterFormProps = {
  isJuridico: boolean;
  requireEmail: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phoneOperatorCode: VenezuelaMobileOperatorCode;
  phoneSubscriberNumber: string;
  firstNameLabel: string;
  lastNameLabel: string;
  businessNameLabel: string;
  emailLabel: string;
  phoneSubscriberPlaceholder: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneOperatorChange: (code: VenezuelaMobileOperatorCode) => void;
  onPhoneSubscriberChange: (number: string) => void;
};

export function CustomerRegisterForm({
  isJuridico,
  requireEmail,
  firstName,
  lastName,
  email,
  phoneOperatorCode,
  phoneSubscriberNumber,
  firstNameLabel,
  lastNameLabel,
  businessNameLabel,
  emailLabel,
  phoneSubscriberPlaceholder,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneOperatorChange,
  onPhoneSubscriberChange,
}: CustomerRegisterFormProps) {
  return (
    <View style={customerFlowLayoutStyles.formFields} testID="customer-register-form">
      {isJuridico ? (
        <CustomerTextField
          label={businessNameLabel}
          value={firstName}
          onChangeText={onFirstNameChange}
          hideLabel
          testID="customer-register-first-name"
        />
      ) : (
        <>
          <CustomerTextField
            label={firstNameLabel}
            value={firstName}
            onChangeText={onFirstNameChange}
            hideLabel
            testID="customer-register-first-name"
          />
          <CustomerTextField
            label={lastNameLabel}
            value={lastName}
            onChangeText={onLastNameChange}
            hideLabel
            testID="customer-register-last-name"
          />
        </>
      )}
      {requireEmail ? (
        <CustomerTextField
          label={emailLabel}
          value={email}
          onChangeText={onEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          hideLabel
          maxLength={CUSTOMER_EMAIL_MAX_LENGTH}
          testID="customer-register-email"
        />
      ) : null}
      <CustomerPhoneField
        subscriberPlaceholder={phoneSubscriberPlaceholder}
        operatorCode={phoneOperatorCode}
        subscriberNumber={phoneSubscriberNumber}
        onOperatorChange={onPhoneOperatorChange}
        onSubscriberChange={onPhoneSubscriberChange}
        hideLabel
      />
    </View>
  );
}
