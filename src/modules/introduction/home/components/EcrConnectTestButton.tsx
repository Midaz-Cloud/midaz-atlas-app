import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { shouldUseMockApi, showKioskDevUi } from '@shared/config';
import { isUsbSerialModuleAvailable, useEcrConnection } from '@shared/peripherals/ecr';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/**
 * Dev control: initialize + open USB serial to the POS (same as Home warmup).
 */
export function EcrConnectTestButton() {
  const [busy, setBusy] = useState(false);
  const ecr = useEcrConnection();

  const onPress = useCallback(async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (shouldUseMockApi()) {
        await ecr.initialize();
        await ecr.connect();
        Alert.alert(
          'POS (mock API)',
          'API en mock: se usa cliente simulado, sin USB real.',
        );
        return;
      }

      if (!isUsbSerialModuleAvailable()) {
        Alert.alert(
          'POS',
          'UsbSerialModule no está en el APK. Recompila Android (npm run android).',
        );
        return;
      }

      await ecr.initialize();
      await ecr.connect();

      const status = ecr.isConnected
        ? 'Puerto USB abierto.'
        : 'Solicitud enviada. Si no conecta, revisa cable y acepta el permiso USB.';
      Alert.alert('POS', status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('POS', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[EcrConnectTestButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, ecr]);

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
      accessibilityLabel="Conectar punto de venta"
      testID="introduction-home-ecr-connect-test">
      {busy ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Conectar POS</Text>
      )}
    </TouchableOpacity>
  );
}
