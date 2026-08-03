import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildSettlementFromEcr,
  createKioskApiClient,
  isSettlementApprovedPlainText,
  loadAccessToken,
  loadLastPosSerial,
  salvageSettlementDataForPrint,
  saveLastPosSerial,
} from '@shared/api/kiosk';
import {
  formatUserFacingError,
  friendlySettlementErrorMessage,
} from '@shared/api/kiosk/friendlySettlementError';
import type { KioskSettlementData } from '@shared/api/kiosk/types';
import { KioskScreenLayout } from '@shared/components';
import {
  clearSuccessfulPosTransactions,
  listSuccessfulPosTransactions,
} from '@shared/persistence';
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
  onOpenFailedPayments?: () => void;
};

type StatusTone = 'neutral' | 'success' | 'error';

export function AdminDashboardScreen({
  onBack,
  onOpenFailedPayments,
}: AdminDashboardScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<StatusTone>('neutral');

  const showStatus = (text: string, tone: StatusTone) => {
    setMessage(text);
    setMessageTone(tone);
  };

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
          lineHeight: kioskScale(32),
          textAlign: 'center',
          marginTop: kioskScale(16),
        },
        statusNeutral: {
          color: colors.title,
        },
        statusSuccess: {
          color: colors.priceAccent,
        },
        statusError: {
          color: '#B42318',
        },
      }),
    [colors],
  );

  const ecr = useEcrConnection();

  const handleClosePos = async () => {
    setLoading(true);
    setMessage(null);
    setMessageTone('neutral');
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
        showStatus(
          formatUserFacingError(
            'El punto de venta no está conectado. Verifica el cable USB e intenta de nuevo.',
          ),
          'error',
        );
        setLoading(false);
        return;
      }

      const response = await ecr.performSettlement();
      console.log('[AdminDashboard] Respuesta completa del POS (JSON):', response);

      const posSerialFallback = await loadLastPosSerial();
      const settlementResult = buildSettlementFromEcr(response, { posSerialFallback });
      const settlementRequest = settlementResult.request;

      // Settlement-only: if structured parse fails but POS shows approval in plain text,
      // salvage whatever fields we can and still print the cierre ticket.
      const plainApproved =
        !settlementResult.ok && isSettlementApprovedPlainText(response);
      const salvaged = plainApproved
        ? salvageSettlementDataForPrint(response, { posSerialFallback })
        : null;

      if (salvaged) {
        console.warn(
          '[AdminDashboard] JSON de cierre corrupto; imprimiendo con campos recuperados del texto POS',
        );
      }

      const printSettlementData: KioskSettlementData | undefined =
        settlementRequest?.settlementData ?? salvaged?.settlementData;
      const printReferenceNo =
        settlementRequest?.settlementId ?? salvaged?.referenceNo;

      if (printSettlementData?.deviceSerial) {
        void saveLastPosSerial(printSettlementData.deviceSerial);
      } else if (settlementRequest?.posSerial) {
        void saveLastPosSerial(settlementRequest.posSerial);
      }

      let backendRegistered = false;
      let backendFriendlyError: string | null = null;
      if (settlementRequest) {
        try {
          const token = await loadAccessToken();
          const client = createKioskApiClient(token ?? undefined);
          const backendResponse = await client.submitSettlement(settlementRequest);
          backendRegistered = true;
          console.log('[AdminDashboard] Cierre registrado en backend:', backendResponse);
        } catch (backendErr) {
          backendFriendlyError = friendlySettlementErrorMessage(backendErr);
          console.warn('[AdminDashboard] Error al registrar cierre en backend:', backendErr);
        }
      }

      let printSuccess = false;
      const shouldPrint =
        (settlementResult.ok && Boolean(printSettlementData)) || Boolean(salvaged);

      if (shouldPrint && printSettlementData) {
        let localTransactions: Awaited<
          ReturnType<typeof listSuccessfulPosTransactions>
        > = [];
        try {
          localTransactions = await listSuccessfulPosTransactions();
        } catch (listErr) {
          console.warn(
            '[AdminDashboard] Error al listar transacciones POS locales:',
            listErr,
          );
        }

        const ticketText = formatSettlementTicketText({
          settlementData: printSettlementData,
          referenceNo: printReferenceNo,
          approved: true,
          transactions: localTransactions.map((tx) => ({
            posReference: tx.posReference,
            createdAt: tx.createdAt,
            amountDisplay: tx.amountDisplay,
            posDateTime: tx.posDateTime,
          })),
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

        try {
          await clearSuccessfulPosTransactions();
        } catch (clearErr) {
          console.warn(
            '[AdminDashboard] Error al limpiar transacciones POS locales:',
            clearErr,
          );
        }
      }

      if (!settlementResult.ok && !salvaged) {
        if (backendRegistered) {
          showStatus(
            formatUserFacingError(
              'El cierre en el datáfono no se completó, pero el intento quedó registrado en el servidor.',
            ),
            'error',
          );
        } else if (backendFriendlyError) {
          showStatus(formatUserFacingError(backendFriendlyError), 'error');
        } else {
          showStatus(
            formatUserFacingError(
              'El datáfono no pudo completar el cierre de lote. Verifica el equipo e intenta de nuevo.',
            ),
            'error',
          );
        }
        return;
      }

      if (backendRegistered && printSuccess) {
        showStatus('Cierre de lote realizado, registrado e impreso con éxito.', 'success');
      } else if (backendRegistered) {
        showStatus(
          formatUserFacingError(
            'El cierre se registró, pero no se pudo imprimir el ticket. Revisa la impresora.',
          ),
          'error',
        );
      } else if (printSuccess) {
        showStatus(
          formatUserFacingError(
            backendFriendlyError ??
              'El ticket se imprimió, pero no se pudo registrar el cierre en el servidor.',
          ),
          'error',
        );
      } else {
        showStatus(
          formatUserFacingError(
            backendFriendlyError ??
              'El cierre se hizo en el datáfono, pero falló la impresión y el registro en el servidor.',
          ),
          'error',
        );
      }
    } catch (err) {
      console.error('[AdminDashboard] Error durante el proceso de cierre:', err);
      showStatus(
        formatUserFacingError(
          'No se pudo completar el cierre de lote. Verifica el datáfono e intenta de nuevo.',
        ),
        'error',
      );
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onOpenFailedPayments}
            disabled={loading || !onOpenFailedPayments}
            testID="admin-failed-payments-button">
            <Text style={styles.buttonText}>Ver pagos fallidos</Text>
          </TouchableOpacity>

          {message ? (
            <Text
              style={[
                styles.statusMessage,
                messageTone === 'success'
                  ? styles.statusSuccess
                  : messageTone === 'error'
                    ? styles.statusError
                    : styles.statusNeutral,
              ]}
              testID="admin-dashboard-status">
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </KioskScreenLayout>
  );
}
