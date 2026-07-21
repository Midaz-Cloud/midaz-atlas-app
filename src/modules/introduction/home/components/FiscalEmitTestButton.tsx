import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { getFiscalServiceBaseUrl, showKioskDevUi, shouldUseMockFiscal } from '@shared/config';
import {
  buildFiscalTestInvoiceRequest,
  checkFiscalHealth,
  emitFiscalInvoice,
} from '@shared/peripherals/fiscal';
import { useKioskOrganization } from '@shared/session';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

function formatEmitMessage(
  envelope: Awaited<ReturnType<typeof emitFiscalInvoice>>,
  mock: boolean,
): string {
  const data = envelope.data;
  const lines = [
    mock ? 'Modo: mock (sin impresora)' : `URL: ${getFiscalServiceBaseUrl()}`,
    envelope.message ?? 'Factura emitida',
    data
      ? [
          `Nro factura: ${data.issuedInvoiceNumber}`,
          `Esperada: ${data.expectedInvoiceNumber}`,
          data.traceLog ? `Log:\n${data.traceLog.slice(0, 200)}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : 'Sin data',
  ];
  return lines.join('\n\n');
}

/**
 * Dev control: emite factura fiscal de prueba via POST /v1/invoices/emit (HkaApp).
 * Usa RIF y razon social de la organizacion del kiosco.
 */
export function FiscalEmitTestButton() {
  const [busy, setBusy] = useState(false);
  const organization = useKioskOrganization();

  const onPress = useCallback(async () => {
    if (busy) {
      return;
    }

    const rif = organization?.rif?.trim();
    const businessName = (organization?.legalName ?? organization?.name)?.trim();

    if (!rif || !businessName) {
      Alert.alert(
        'Fiscal',
        'Faltan RIF o razon social en la configuracion de la organizacion.',
      );
      return;
    }

    setBusy(true);
    try {
      if (!shouldUseMockFiscal()) {
        const health = await checkFiscalHealth({ probeEnq: true });
        if (!health.data?.healthy) {
          Alert.alert(
            'Fiscal no disponible',
            health.message ??
              health.error ??
              'El servicio fiscal o la impresora no estan listos. Abra HkaApp y verifique USB.',
          );
          return;
        }
      }

      const request = buildFiscalTestInvoiceRequest({
        rif,
        businessName,
        address: organization?.name?.trim() || undefined,
        declaresTaxes: organization?.declaresTaxes ?? true,
      });

      if (__DEV__) {
        console.log('[FiscalEmitTestButton] request', request);
      }

      const envelope = await emitFiscalInvoice(request);
      Alert.alert(
        envelope.success ? 'Factura emitida' : 'Emision fallida',
        formatEmitMessage(envelope, shouldUseMockFiscal()),
      );

      if (__DEV__) {
        console.log('[FiscalEmitTestButton] response', envelope);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Fiscal', `Error al emitir: ${message}`);
      if (__DEV__) {
        console.warn('[FiscalEmitTestButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, organization?.declaresTaxes, organization?.legalName, organization?.name, organization?.rif]);

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
      accessibilityLabel="Probar emision factura fiscal"
      testID="introduction-home-fiscal-emit-test">
      {busy ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar factura fiscal</Text>
      )}
    </TouchableOpacity>
  );
}
