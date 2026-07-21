import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildSettlementFromEcr,
  createKioskApiClient,
  loadAccessToken,
  loadLastPosSerial,
  saveLastPosSerial,
} from '@shared/api/kiosk';
import { KioskScreenLayout } from '@shared/components';
import { useEcrConnection } from '@shared/peripherals/ecr';
import {
  createPrinterClient,
  formatSettlementTicketText,
  sanitizePrinterText,
} from '@shared/peripherals/printer';
import { displayTextStyle, bodyTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type AdminDashboardScreenProps = {
  onBack: () => void;
};

export function AdminDashboardScreen({ onBack }: AdminDashboardScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: kioskScale(40),
          paddingVertical: kioskScale(40),
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScale(32),
        },
        card: {
          width: '100%',
          maxWidth: kioskScale(640),
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(3),
          borderColor: colors.productDetailBorder,
          padding: kioskScale(48),
          alignItems: 'center',
          gap: kioskScale(32),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(48),
          lineHeight: kioskScale(56),
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          lineHeight: kioskScale(32),
          color: colors.menuSectionMuted,
          textAlign: 'center',
        },
        button: {
          width: '100%',
          height: kioskScale(112),
          borderRadius: kioskScale(20),
          backgroundColor: colors.priceAccent,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: kioskScale(16),
        },
        buttonDisabled: {
          opacity: 0.6,
        },
        buttonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(32),
          color: colors.title,
        },
        statusMessage: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          color: colors.title,
          textAlign: 'center',
          marginTop: kioskScale(16),
        },
      }),
    [colors],
  );

  const ecr = useEcrConnection();

  const handleClosePos = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let connected = ecr.isConnected;
      if (!connected) {
        try {
          await ecr.initialize();
          await ecr.connect();
          connected = ecr.isConnected;
        } catch (connErr) {
          console.warn('[AdminDashboard] Error al intentar conectar con el POS:', connErr);
        }
      }

      if (!connected) {
        setMessage(
          'El punto de venta (POS) no esta conectado. Por favor, verifique la conexion USB.',
        );
        setLoading(false);
        return;
      }

      const response = await ecr.performSettlement();
      console.log('[AdminDashboard] Respuesta completa del POS (JSON):', response);

      const posSerialFallback = await loadLastPosSerial();
      const settlementResult = buildSettlementFromEcr(response, { posSerialFallback });
      const settlementRequest = settlementResult.request;

      if (settlementRequest?.settlementData?.deviceSerial) {
        void saveLastPosSerial(settlementRequest.settlementData.deviceSerial);
      }

      let backendRegistered = false;
      let backendError: string | null = null;
      if (settlementRequest) {
        try {
          const token = await loadAccessToken();
          const client = createKioskApiClient(token ?? undefined);
          const backendResponse = await client.submitSettlement(settlementRequest);
          backendRegistered = true;
          console.log('[AdminDashboard] Cierre registrado en backend:', backendResponse);
        } catch (backendErr) {
          backendError =
            backendErr instanceof Error ? backendErr.message : String(backendErr);
          console.warn('[AdminDashboard] Error al registrar cierre en backend:', backendErr);
        }
      }

      let printSuccess = false;
      if (settlementResult.ok && settlementRequest?.settlementData) {
        const ticketText = formatSettlementTicketText({
          settlementData: settlementRequest.settlementData,
          referenceNo: settlementRequest.settlementId,
          approved: true,
        });
        const sanitizedTicketText = sanitizePrinterText(ticketText);
        const printer = createPrinterClient();
        try {
          await printer.connect();
          await printer.printText(sanitizedTicketText, 'CIERRE DE LOTE');
          printSuccess = true;
        } catch (printErr) {
          console.warn('[AdminDashboard] Error al imprimir el ticket de cierre:', printErr);
        } finally {
          try {
            await printer.disconnect();
          } catch {}
        }
      }

      if (!settlementResult.ok) {
        const detail = settlementResult.message ?? 'El cierre del POS fallo.';
        if (backendRegistered) {
          setMessage(`${detail} El intento fue registrado en el servidor.`);
        } else if (backendError) {
          setMessage(`${detail} No se pudo registrar en el servidor: ${backendError}`);
        } else {
          setMessage(detail);
        }
        return;
      }

      if (backendRegistered && printSuccess) {
        setMessage('Cierre de lote realizado, registrado e impreso con exito.');
      } else if (backendRegistered) {
        setMessage('Cierre de lote realizado y registrado, pero fallo la impresion del ticket.');
      } else if (printSuccess) {
        setMessage(
          `Cierre de lote realizado e impreso, pero no se pudo registrar en el servidor${backendError ? `: ${backendError}` : '.'}`,
        );
      } else {
        setMessage(
          `Cierre de lote realizado en el POS, pero fallo la impresion y el registro en el servidor${backendError ? `: ${backendError}` : '.'}`,
        );
      }
    } catch (err) {
      console.error('[AdminDashboard] Error durante el proceso de cierre:', err);
      setMessage(`Error al realizar el cierre: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KioskScreenLayout
      testID="admin-dashboard-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="admin-dashboard-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Panel de Superusuario</Text>
          <Text style={styles.subtitle}>
            Desde esta seccion puedes realizar operaciones administrativas en el kiosco.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleClosePos}
            disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={colors.title} /> : null}
            <Text style={styles.buttonText}>
              {loading ? 'Procesando Cierre...' : 'Realizar Cierre de Lote'}
            </Text>
          </TouchableOpacity>

          {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
        </View>
      </View>
    </KioskScreenLayout>
  );
}
