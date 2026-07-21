import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { getFiscalServiceBaseUrl, showKioskDevUi, shouldUseMockFiscal } from '@shared/config';
import { checkFiscalHealth } from '@shared/peripherals/fiscal';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

function formatHealthMessage(
  envelope: Awaited<ReturnType<typeof checkFiscalHealth>>,
  mock: boolean,
): string {
  const data = envelope.data;
  const lines = [
    mock ? 'Modo: mock (sin fetch)' : `URL: ${getFiscalServiceBaseUrl()}`,
    `Estado: ${data?.healthy ? 'OK' : 'NO DISPONIBLE'}`,
    envelope.message ?? envelope.error ?? '—',
    data
      ? [
          `Servicio: ${data.serviceRunning ? 'activo' : 'inactivo'}`,
          `USB: ${data.usbConnected ? 'conectado' : 'desconectado'}`,
          `Impresora lista: ${data.printerReady ? 'si' : 'no'}`,
          `Status code: ${data.printerStatusCode}`,
          data.enqOk ? 'ENQ: ok' : null,
        ]
          .filter(Boolean)
          .join('\n')
      : 'Sin data',
  ];
  return lines.join('\n\n');
}

/**
 * Dev control: consulta GET /v1/health del servicio fiscal HkaApp.
 */
export function FiscalHealthTestButton() {
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      const envelope = await checkFiscalHealth({ probeEnq: true });
      const title = envelope.data?.healthy ? 'Fiscal OK' : 'Fiscal no disponible';
      Alert.alert(title, formatHealthMessage(envelope, shouldUseMockFiscal()));
      if (__DEV__) {
        console.log('[FiscalHealthTestButton]', envelope);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Fiscal', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[FiscalHealthTestButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
      accessibilityLabel="Probar impresora fiscal"
      testID="introduction-home-fiscal-health-test">
      {busy ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar fiscal (health)</Text>
      )}
    </TouchableOpacity>
  );
}
