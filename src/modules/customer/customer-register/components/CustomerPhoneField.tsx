import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  VENEZUELA_SUBSCRIBER_NUMBER_LENGTH,
  type VenezuelaMobileOperatorCode,
} from '@shared/phone';
import { kioskScreenLayout } from '@shared/theme';

import { useCustomerRegisterFieldStyles } from '../theme/customerRegisterFieldStyles';
import { CustomerPhoneOperatorSelector } from './CustomerPhoneOperatorSelector';

export type CustomerPhoneFieldProps = {
  label?: string;
  subscriberPlaceholder: string;
  operatorCode: VenezuelaMobileOperatorCode;
  subscriberNumber: string;
  onOperatorChange: (code: VenezuelaMobileOperatorCode) => void;
  onSubscriberChange: (number: string) => void;
  hideLabel?: boolean;
};

export function CustomerPhoneField({
  label,
  subscriberPlaceholder,
  operatorCode,
  subscriberNumber,
  onOperatorChange,
  onSubscriberChange,
  hideLabel = false,
}: CustomerPhoneFieldProps) {
  const fieldStyles = useCustomerRegisterFieldStyles();

  return (
    <View style={styles.root} testID="customer-phone-field">
      {hideLabel || !label ? null : <Text style={fieldStyles.label}>{label}</Text>}
      <View style={fieldStyles.phoneRow}>
        <View style={fieldStyles.phoneOperatorSlot}>
          <CustomerPhoneOperatorSelector
            value={operatorCode}
            onChange={onOperatorChange}
          />
        </View>
        <TextInput
          style={[fieldStyles.input, styles.subscriberInput]}
          value={subscriberNumber}
          onChangeText={(value) => {
            const digits = value.replace(/\D/g, '').slice(0, VENEZUELA_SUBSCRIBER_NUMBER_LENGTH);
            onSubscriberChange(digits);
          }}
          keyboardType="number-pad"
          placeholder={subscriberPlaceholder}
          placeholderTextColor={fieldStyles.label.color}
          accessibilityLabel={subscriberPlaceholder}
          maxLength={VENEZUELA_SUBSCRIBER_NUMBER_LENGTH}
          testID="customer-register-phone-subscriber"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: kioskScreenLayout.modifiersHeaderGap * 0.5,
  },
  subscriberInput: {
    flex: 1,
  },
});
