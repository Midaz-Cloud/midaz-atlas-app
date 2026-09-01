import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { shouldUseMockApi, showKioskDevUi } from '@shared/config';
import { useEcrConnection } from '@shared/peripherals/ecr';
import { buildSettlementFromEcr } from '@shared/api/kiosk/mappers/buildSettlementFromEcr';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/**
 * Dev control: sends `{ type: 'settlement', ... }` over USB and waits for terminal JSON (120s).
 */
export function EcrSettlementTestButton() {
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

      const response = await ecr.performSettlement();
      const result = buildSettlementFromEcr(response);
      const mode = shouldUseMockApi() ? 'mock API' : ecr.usesNativeUsb ? 'USB' : 'simulado';

      Alert.alert(
        result.ok ? 'Cierre POS (OK)' : 'Cierre POS (rechazado)',
        [
          `Modo: ${mode}`,
          result.ok
            ? `Serial: ${result.request.settlementData?.deviceSerial}`
            : `Motivo: ${result.message}`,
          result.ok
            ? `Débito/Crédito Visa-Master: ${result.request.settlementData?.totalVisaMasterDebitSale ?? '—'}`
            : null,
          `Respuesta: ${response.length > 300 ? `${response.slice(0, 300)}…` : response}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ecr.error ?? String(error);
      Alert.alert('Cierre POS', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[EcrSettlementTestButton]', error);
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
      accessibilityLabel="Probar cierre de lote en punto de venta"
      testID="introduction-home-ecr-settlement-test">
      {loading ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar cierre POS</Text>
      )}
    </TouchableOpacity>
  );
}
