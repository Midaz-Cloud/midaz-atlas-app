import { StyleSheet, View } from 'react-native';

import type { VenezuelaMobileOperatorCode } from '@shared/phone';
import { kioskScreenLayout } from '@shared/theme';

import { customerFlowLayoutStyles } from '../../theme/customerFlowLayout';
import { CustomerPhoneField } from './CustomerPhoneField';
import { CustomerTextField } from './CustomerTextField';

export type CustomerRegisterFormProps = {
  isJuridico: boolean;
  firstName: string;
  lastName: string;
  phoneOperatorCode: VenezuelaMobileOperatorCode;
  phoneSubscriberNumber: string;
  firstNameLabel: string;
  lastNameLabel: string;
  businessNameLabel: string;
  phoneSubscriberPlaceholder: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneOperatorChange: (code: VenezuelaMobileOperatorCode) => void;
  onPhoneSubscriberChange: (number: string) => void;
};

export function CustomerRegisterForm({
  isJuridico,
  firstName,
  lastName,
  phoneOperatorCode,
  phoneSubscriberNumber,
  firstNameLabel,
  lastNameLabel,
  businessNameLabel,
  phoneSubscriberPlaceholder,
  onFirstNameChange,
  onLastNameChange,
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
        <View style={styles.nameRow}>
          <CustomerTextField
            label={firstNameLabel}
            value={firstName}
            onChangeText={onFirstNameChange}
            hideLabel
            style={styles.nameField}
            testID="customer-register-first-name"
          />
          <CustomerTextField
            label={lastNameLabel}
            value={lastName}
            onChangeText={onLastNameChange}
            hideLabel
            style={styles.nameField}
            testID="customer-register-last-name"
          />
        </View>
      )}
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

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: kioskScreenLayout.customerRegisterNameRowGap,
  },
  nameField: {
    flex: 1,
  },
});
