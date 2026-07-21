import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconTicketInfo from '@assets/images/payment/outcome/icon-ticket-info.svg';

export type OrderOutcomeHintRowProps = {
  message: string;
};

/** Aviso ranura ticket P14 (Figma 57:311). */
export function OrderOutcomeHintRow({ message }: OrderOutcomeHintRowProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'stretch',
          maxWidth: kioskScreenLayout.paymentOutcomeOrderCardWidth,
          gap: kioskScreenLayout.paymentOutcomeHintGap,
        },
        text: {
          ...bodyTextStyle(),
          flex: 1,
          fontSize: kioskScreenLayout.paymentOutcomeHintTextSize,
          lineHeight: kioskScreenLayout.paymentOutcomeHintTextLineHeight,
          color: colors.paymentReferenceMuted,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row}>
      <IconTicketInfo
        width={kioskScreenLayout.paymentOutcomeHintIconSize}
        height={kioskScreenLayout.paymentOutcomeHintIconSize}
        color={colors.paymentReferenceMuted}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
