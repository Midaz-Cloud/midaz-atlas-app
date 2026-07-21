import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCustomerRegisterFieldStyles } from '@modules/customer/customer-register/theme/customerRegisterFieldStyles';
import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';
import type { KioskBank } from '@shared/api/kiosk';

export type PaymentBankSelectorFieldProps = {
  label: string;
  placeholder: string;
  selectedBank: KioskBank | null;
  onPress: () => void;
  testID?: string;
  /** Sin etiqueta superior; placeholder centrado (Figma 205:367). */
  pill?: boolean;
};

export function PaymentBankSelectorField({
  label,
  placeholder,
  selectedBank,
  onPress,
  testID,
  pill = false,
}: PaymentBankSelectorFieldProps) {
  const colors = useKioskScreenColors();
  const fieldStyles = useCustomerRegisterFieldStyles();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          ...fieldStyles.input,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: kioskScale(12),
          ...(pill
            ? {
                minHeight: kioskScreenLayout.paymentMobileConfirmFieldMinHeight,
                justifyContent: 'space-between',
                paddingVertical: kioskScale(36),
              }
            : {}),
        },
        triggerPillText: {
          textAlign: 'left',
        },
        valueText: {
          ...fieldStyles.inputValueText,
          flex: 1,
        },
        placeholderText: {
          ...fieldStyles.inputValueText,
          flex: 1,
          color: colors.menuSectionMuted,
        },
        chevron: {
          ...displayTextStyle(),
          fontSize: pill
            ? kioskScale(48)
            : kioskScreenLayout.paymentReferenceInputLabelSize * 0.7,
          color: colors.menuSectionMuted,
          flexShrink: 0,
        },
      }),
    [colors.menuSectionMuted, fieldStyles, pill],
  );

  const displayValue = selectedBank
    ? `${selectedBank.name} (${selectedBank.code})`
    : null;

  const triggerContent = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pill ? placeholder : label}
      onPress={onPress}
      style={styles.trigger}
      testID={testID ? `${testID}-trigger` : undefined}>
      <Text
        style={[
          displayValue ? styles.valueText : styles.placeholderText,
          pill && styles.triggerPillText,
          pill && { flex: 1 },
        ]}
        numberOfLines={pill ? 1 : 2}>
        {displayValue ?? placeholder}
      </Text>
      <Text style={styles.chevron}>▼</Text>
    </Pressable>
  );

  if (pill) {
    return (
      <View style={pillRoot} testID={testID}>
        {triggerContent}
      </View>
    );
  }

  return (
    <View style={fieldRoot} testID={testID}>
      <Text style={fieldStyles.label}>{label}</Text>
      {triggerContent}
    </View>
  );
}

const fieldRoot = {
  alignSelf: 'stretch' as const,
  gap: kioskScreenLayout.paymentMobileFormFieldGap,
};

const pillRoot = {
  alignSelf: 'stretch' as const,
};
