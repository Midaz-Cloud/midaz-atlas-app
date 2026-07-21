import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { shouldUseMockApi, showKioskDevUi } from '@shared/config';
import {
  formatEcrDocumentNumber,
  formatEcrTerminalAmountHint,
  parseEcrPaymentResponse,
  toEcrTerminalAmount,
  useEcrConnection,
} from '@shared/peripherals/ecr';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/** 1.00 Bs de prueba → el terminal recibe 100 (montos ×100). */
const TEST_PAYMENT_AMOUNT_VES = 1;

/**
 * Dev control: sends `{ type: 'payment', ... }` over USB and waits for terminal JSON (120s).
 */
export function EcrPaymentTestButton() {
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

      const documentNumber = formatEcrDocumentNumber();
      const response = await ecr.performPayment(documentNumber, TEST_PAYMENT_AMOUNT_VES);
      const { approved, status, message } = parseEcrPaymentResponse(response);
      const mode = shouldUseMockApi() ? 'mock API' : ecr.usesNativeUsb ? 'USB' : 'simulado';

      Alert.alert(
        approved ? 'Pago POS (OK)' : 'Pago POS (rechazado)',
        [
          `Modo: ${mode}`,
          `Monto: ${formatEcrTerminalAmountHint(toEcrTerminalAmount(TEST_PAYMENT_AMOUNT_VES))}`,
          `Doc: ${documentNumber}`,
          status ? `Status: ${status}` : null,
          message ? `Mensaje: ${message}` : null,
          `Respuesta: ${response.length > 200 ? `${response.slice(0, 200)}…` : response}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ecr.error ?? String(error);
      Alert.alert('Pago POS', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[EcrPaymentTestButton]', error);
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
      accessibilityLabel="Probar pago en punto de venta"
      testID="introduction-home-ecr-payment-test">
      {loading ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar pago POS</Text>
      )}
    </TouchableOpacity>
  );
}
