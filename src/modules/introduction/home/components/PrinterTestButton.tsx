import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import { getPrinterTestOrderParams, printOrderTicket } from '@shared/peripherals/printer';
import { useKioskOrganization } from '@shared/session';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/**
 * Temporary dev control to exercise PrinterModule2 without the purchase flow.
 * Remove when hardware validation is done.
 */
export function PrinterTestButton() {
  const [busy, setBusy] = useState(false);
  const organization = useKioskOrganization();

  const onPress = useCallback(async () => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await printOrderTicket({
        ...getPrinterTestOrderParams(),
        organizationName: organization?.name,
        organizationLegalName: organization?.legalName,
        printQrEnabled: true,
        trackShortCode: 'ABC1',
      });
      Alert.alert('Impresora', 'Ticket de prueba (orden mock + QR) enviado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Impresora', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[PrinterTestButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, organization?.name]);

  if (!showKioskDevUi()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Probar impresora"
      testID="introduction-home-printer-test">
      {busy ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar impresora</Text>
      )}
    </TouchableOpacity>
  );
}
