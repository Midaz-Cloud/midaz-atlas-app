import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bodyTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconSync from '@assets/images/payment/pos/icon-sync.svg';

export type PaymentPosSyncStatusProps = {
  message: string;
};

/** Estado de sincronización ECR (Figma 47:27–47:31). */
export function PaymentPosSyncStatus({ message }: PaymentPosSyncStatusProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScreenLayout.paymentPosSyncGap,
          alignSelf: 'stretch',
        },
        message: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentPosSubtitleSize,
          lineHeight: kioskScreenLayout.paymentPosSubtitleLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.root} testID="payment-pos-sync-status">
      <IconSync
        width={kioskScreenLayout.paymentPosSyncIconSize}
        height={kioskScreenLayout.paymentPosSyncIconSize}
        color={colors.menuSectionMuted}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
