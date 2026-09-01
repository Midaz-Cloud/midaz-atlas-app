import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import { checkPosVersion, posVersionCheckMessage, useEcrConnection } from '@shared/peripherals/ecr';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/**
 * Dev control: sends `{ type: 'version' }` over USB and validates the datáfono's
 * PKUSB/veslc versions against what's pinned in `checkPosVersion.ts`. This is the
 * same check `executePosCardPayment` runs before every real card charge.
 */
export function EcrVersionCheckButton() {
  const [busy, setBusy] = useState(false);
  const ecr = useEcrConnection();
  const loading = busy || ecr.isProcessing;

  useEffect(() => {
    if (!ecr.isProcessing && busy) {
      setBusy(false);
    }
  }, [busy, ecr.isProcessing]);

  const onPress = useCallback(async () => {
    if (loading) {
      return;
    }

    setBusy(true);
    try {
      if (!ecr.isConnected) {
        await ecr.initialize();
        await ecr.connect();
      }

      if (ecr.usesNativeUsb && !ecr.isConnected) {
        Alert.alert(
          'POS',
          'Terminal no conectado. Usa «Conectar POS» y acepta el permiso USB.',
        );
        return;
      }

      const check = await checkPosVersion(ecr);

      Alert.alert(
        check.ok ? 'Versión POS (OK)' : 'Versión POS (bloqueada)',
        check.ok
          ? `PKUSB app: ${check.appVersionCode}\nveslc: ${check.veslcVersionCode}`
          : posVersionCheckMessage(check) +
              (check.details ? `\n\n${check.details}` : ''),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ecr.error ?? String(error);
      Alert.alert('Versión POS', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[EcrVersionCheckButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [ecr, loading]);

  if (!showKioskDevUi()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Probar versión del punto de venta"
      testID="introduction-home-ecr-version-test">
      {loading ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar versión POS</Text>
      )}
    </TouchableOpacity>
  );
}
