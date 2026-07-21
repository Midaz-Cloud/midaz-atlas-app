import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  mediumTextStyle,
  useKioskScreenColors,
  type KioskScreenThemeColors,
} from '@shared/theme';

export function createCustomerRegisterFieldStyles(colors: KioskScreenThemeColors) {
  return StyleSheet.create({
    label: {
      ...mediumTextStyle(),
      fontSize: kioskScreenLayout.paymentReferenceInputLabelSize * 0.55,
      color: colors.menuSectionMuted,
    },
    input: {
      ...displayTextStyle(),
      alignSelf: 'stretch',
      backgroundColor: colors.cardBackground,
      borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
      borderColor: colors.paymentReferenceInputBorder,
      borderRadius: kioskScreenLayout.paymentReferenceInputRadius,
      paddingHorizontal: kioskScreenLayout.paymentReferenceInputPaddingHorizontal,
      paddingVertical: kioskScreenLayout.paymentReferenceInputPaddingVertical,
      fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
      color: colors.title,
    },
    inputValueText: {
      ...displayTextStyle(),
      fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
      color: colors.title,
    },
    phoneOperatorSlot: {
      width: kioskScreenLayout.customerPhoneOperatorSelectorWidth,
      flexShrink: 0,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: kioskScreenLayout.customerRegisterNameRowGap,
    },
  });
}

export function useCustomerRegisterFieldStyles() {
  const colors = useKioskScreenColors();
  return useMemo(() => createCustomerRegisterFieldStyles(colors), [colors]);
}
