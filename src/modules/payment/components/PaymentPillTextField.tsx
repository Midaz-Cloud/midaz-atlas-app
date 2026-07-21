import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useCustomerRegisterFieldStyles } from '@modules/customer/customer-register/theme/customerRegisterFieldStyles';
import { kioskScreenLayout } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type PaymentPillTextFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID?: string;
  textAlign?: 'left' | 'center';
} & Pick<
  TextInputProps,
  'keyboardType' | 'autoCapitalize' | 'autoCorrect' | 'maxLength'
>;

/** Campo tipo píldora P10 (c) · Confirmar pago móvil (Figma 205:257). */
export function PaymentPillTextField({
  value,
  onChangeText,
  placeholder,
  testID,
  textAlign = 'center',
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
}: PaymentPillTextFieldProps) {
  const fieldStyles = useCustomerRegisterFieldStyles();

  return (
    <TextInput
      style={[fieldStyles.input, styles.pill, { textAlign }]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor={fieldStyles.label.color}
      accessibilityLabel={placeholder}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: kioskScreenLayout.paymentMobileConfirmFieldMinHeight,
    paddingVertical: kioskScale(36),
  },
});
