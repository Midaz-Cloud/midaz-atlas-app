import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useCustomerRegisterFieldStyles } from '@modules/customer/customer-register/theme/customerRegisterFieldStyles';
import { kioskScreenLayout } from '@shared/theme';

export type PaymentFormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
  testID?: string;
  compact?: boolean;
};

export function PaymentFormField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
  testID,
  compact = false,
}: PaymentFormFieldProps) {
  const fieldStyles = useCustomerRegisterFieldStyles();

  return (
    <View style={[styles.root, compact && styles.rootCompact]} testID={testID}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        placeholder={label}
        placeholderTextColor={fieldStyles.label.color}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: kioskScreenLayout.modifiersHeaderGap * 0.5,
  },
  rootCompact: {
    gap: kioskScreenLayout.paymentMobileFormFieldGap,
  },
});
