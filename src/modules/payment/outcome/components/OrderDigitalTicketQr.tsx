import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import { buildDigitalTicketQrValue } from '@shared/kiosk-order/buildDigitalTicketQrValue';

export type OrderDigitalTicketQrProps = {
  orderId: string;
  testID?: string;
};

/** QR dinámico ticket digital P15 (Figma 64:19). */
export function OrderDigitalTicketQr({
  orderId,
  testID = 'payment-order-digital-ticket-qr',
}: OrderDigitalTicketQrProps) {
  const colors = useKioskScreenColors();
  const size = kioskScreenLayout.paymentMobileQrSize;
  const value = buildDigitalTicketQrValue(orderId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [],
  );

  return (
    <View style={styles.wrap} testID={testID}>
      <QRCode
        value={value}
        size={size}
        color={colors.title}
        backgroundColor="transparent"
      />
    </View>
  );
}
