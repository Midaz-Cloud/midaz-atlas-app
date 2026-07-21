import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import QrCode from '@assets/images/payment/mobile/qr-code.svg';

export type PaymentMobileQrCodeProps = {
  qrCodeUri?: string | null;
  loadingQr?: boolean;
};

export function PaymentMobileQrCode({ qrCodeUri, loadingQr }: PaymentMobileQrCodeProps) {
  const colors = useKioskScreenColors();
  const size = kioskScreenLayout.paymentMobileQrSize;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID="payment-mobile-qr">
      {loadingQr ? (
        <ActivityIndicator size="large" color={colors.title} />
      ) : qrCodeUri ? (
        <Image
          source={{ uri: qrCodeUri }}
          style={{ width: size, height: size, borderRadius: 8 }}
          resizeMode="contain"
        />
      ) : (
        <QrCode width={size} height={size} color={colors.title} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
