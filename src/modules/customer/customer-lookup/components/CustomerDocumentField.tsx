import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CustomerDocumentType } from '@shared/api/kiosk';
import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { CustomerDocumentTypeSelector } from './CustomerDocumentTypeSelector';

export type CustomerDocumentFieldProps = {
  label: string;
  documentType: CustomerDocumentType;
  documentNumber: string;
  onTypeChange: (type: CustomerDocumentType) => void;
};

/** Campo de cédula: selector V/J/E + número solo dígitos. */
export function CustomerDocumentField({
  label,
  documentType,
  documentNumber,
  onTypeChange,
}: CustomerDocumentFieldProps) {
  const colors = useKioskScreenColors();
  const isPlaceholder = documentNumber.length === 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: kioskScale(12),
        },
        numberCard: {
          flex: 1,
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.paymentReferenceInputBorderWidth,
          borderColor: colors.paymentReferenceInputBorder,
          borderRadius: kioskScreenLayout.paymentReferenceInputRadius,
          paddingHorizontal: kioskScreenLayout.paymentReferenceInputPaddingHorizontal,
          paddingVertical: kioskScreenLayout.paymentReferenceInputPaddingVertical,
          justifyContent: 'center',
          minHeight: kioskScreenLayout.paymentReferenceInputPaddingVertical * 2 + 48,
        },
        text: {
          ...displayTextStyle(),
        },
        placeholder: {
          fontSize: kioskScreenLayout.paymentReferenceInputLabelSize,
          lineHeight: kioskScreenLayout.paymentReferenceInputLabelLineHeight,
          color: colors.title,
        },
        digits: {
          fontSize: kioskScreenLayout.paymentReferenceDigitsSize,
          letterSpacing: kioskScreenLayout.paymentReferenceDigitsLetterSpacing,
          color: colors.title,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row} testID="customer-document-field">
      <CustomerDocumentTypeSelector value={documentType} onChange={onTypeChange} />
      <View style={styles.numberCard} accessibilityLabel={label}>
        <Text
          style={[styles.text, isPlaceholder ? styles.placeholder : styles.digits]}
          numberOfLines={1}>
          {isPlaceholder ? label : documentNumber}
        </Text>
      </View>
    </View>
  );
}
