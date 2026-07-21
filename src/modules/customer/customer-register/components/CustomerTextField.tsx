import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import { useCustomerRegisterFieldStyles } from '../theme/customerRegisterFieldStyles';

export type CustomerTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  hideLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function CustomerTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  hideLabel = false,
  style,
  testID,
}: CustomerTextFieldProps) {
  const fieldStyles = useCustomerRegisterFieldStyles();

  return (
    <View style={[styles.root, style]} testID={testID}>
      {hideLabel ? null : <Text style={fieldStyles.label}>{label}</Text>}
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
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
});
