import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  classifyRetryDuplicateRisk,
  evaluateFailedPaymentSalvage,
  retryFailedPaymentOrder,
  salvageFailedPaymentById,
} from '@modules/payment/recovery';
import { parseDeclaresTaxes } from '@shared/api/kiosk/utils/declaresTaxes';
import { KioskScreenLayout } from '@shared/components';
import {
  getFailedPayment,
  type FailedPaymentRecord,
} from '@shared/persistence';
import { useKioskOrganization } from '@shared/session';
import { bodyTextStyle, displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  salvaged: 'Recuperada (en lote de cierre)',
  retry_pending: 'Reintento pendiente (verificar backend)',
  retried_ok: 'Orden registrada en backend',
  retry_failed: 'Reintento de orden falló',
  dismissed: 'Descartada',
};

export type FailedPaymentDetailScreenProps = {
  paymentId: number;
  onBack: () => void;
};

function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

function DetailSection({
  title,
  children,
  styles,
}: {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Line({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | number | null;
  styles: ReturnType<typeof createStyles>;
}) {
  if (value == null || value === '') {
    return null;
  }
  return (
    <Text style={styles.line}>
      <Text style={styles.lineLabel}>{label}: </Text>
      {String(value)}
    </Text>
  );
}

function createStyles(colors: ReturnType<typeof useKioskScreenColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: kioskScale(40),
      paddingTop: kioskScale(16),
      width: '100%',
    },
    title: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(36),
      color: colors.title,
      textAlign: 'center',
      marginBottom: kioskScale(16),
    },
    section: {
      marginBottom: kioskScale(28),
      gap: kioskScale(8),
    },
    sectionTitle: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(26),
      color: colors.priceAccent,
      marginBottom: kioskScale(4),
    },
    line: {
      ...bodyTextStyle(),
      fontSize: kioskScale(22),
      lineHeight: kioskScale(30),
      color: colors.title,
    },
    lineLabel: {
      fontWeight: '700',
    },
    mono: {
      ...bodyTextStyle(),
      fontSize: kioskScale(18),
      lineHeight: kioskScale(26),
      color: colors.menuSectionMuted,
      fontFamily: 'monospace',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      ...bodyTextStyle(),
      fontSize: kioskScale(22),
      color: colors.title,
      textAlign: 'center',
    },
    recoveryButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: kioskScale(24),
      paddingVertical: kioskScale(12),
      borderRadius: kioskScale(14),
      borderWidth: kioskScale(2),
      borderColor: colors.priceAccent,
      marginTop: kioskScale(8),
    },
    recoveryButtonText: {
      ...displayTextStyle({ fontWeight: '700' }),
      fontSize: kioskScale(20),
      color: colors.priceAccent,
    },
    recoveryWarning: {
      ...bodyTextStyle(),
      fontSize: kioskScale(20),
      lineHeight: kioskScale(28),
      color: colors.title,
      marginTop: kioskScale(8),
    },
  });
}

export function FailedPaymentDetailScreen({
  paymentId,
  onBack,
}: FailedPaymentDetailScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<FailedPaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [confirmingRetry, setConfirmingRetry] = useState(false);
  const organization = useKioskOrganization();

  const reload = useCallback(async () => {
    const row = await getFailedPayment(paymentId);
    setRecord(row);
  }, [paymentId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getFailedPayment(paymentId);
        if (!cancelled) {
          setRecord(row);
          if (!row) {
            setError('Registro no encontrado.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const evaluation = useMemo(
    () => (record ? evaluateFailedPaymentSalvage(record) : null),
    [record],
  );
  const duplicateRisk = record ? classifyRetryDuplicateRisk(record) : 'low';
  const canRetryOrder =
    record != null &&
    (record.status === 'salvaged' ||
      record.status === 'retry_failed' ||
      (record.status === 'open' && record.stage === 'order_register'));

  const handleSalvage = useCallback(async () => {
    setRecoveryBusy(true);
    setRecoveryMessage(null);
    try {
      const outcome = await salvageFailedPaymentById(paymentId);
      setRecoveryMessage(
        outcome.salvaged
          ? 'Pago reclasificado como aprobado y agregado al lote de cierre.'
          : `No se pudo reclasificar (${outcome.reason}${outcome.message ? `: ${outcome.message}` : ''}).`,
      );
      await reload();
    } catch (err) {
      setRecoveryMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRecoveryBusy(false);
    }
  }, [paymentId, reload]);

  const handleRetryOrder = useCallback(async () => {
    setConfirmingRetry(false);
    setRecoveryBusy(true);
    setRecoveryMessage(null);
    try {
      const result = await retryFailedPaymentOrder({
        id: paymentId,
        declaresTaxes: parseDeclaresTaxes(organization?.declaresTaxes),
      });
      setRecoveryMessage(
        result.ok
          ? `Orden registrada en backend: ${result.displayOrderNumber}.`
          : `Reintento no ejecutado (${result.reason}${result.message ? `: ${result.message}` : ''}).`,
      );
      await reload();
    } catch (err) {
      setRecoveryMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRecoveryBusy(false);
    }
  }, [organization, paymentId, reload]);

  const customerName = record?.customer
    ? `${record.customer.firstName ?? ''} ${record.customer.lastName ?? ''}`.trim()
    : '';

  return (
    <KioskScreenLayout
      testID="failed-payment-detail-screen"
      showPattern
      contentAlign="stretch"
      onBack={onBack}
      backButtonTestID="failed-payment-detail-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.priceAccent} />
        </View>
      ) : error || !record ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? 'Registro no encontrado.'}</Text>
        </View>
      ) : (
        <ScrollView style={styles.container}>
          <Text style={styles.title}>{record.displayRef}</Text>

          <DetailSection title="Resumen" styles={styles}>
            <Line label="Fecha" value={formatLocalDateTime(record.createdAt)} styles={styles} />
            <Line label="Etapa" value={record.stage} styles={styles} />
            <Line label="Método" value={record.paymentMethod} styles={styles} />
            <Line
              label="Estado"
              value={STATUS_LABELS[record.status] ?? record.status}
              styles={styles}
            />
          </DetailSection>

          <DetailSection title="Recuperación" styles={styles}>
            {evaluation?.eligible ? (
              <>
                <Text style={styles.line}>
                  El terminal aprobó este pago. Payload reconstruido: monto{' '}
                  {evaluation.payload.posResponse.amount} · RRN{' '}
                  {evaluation.payload.posResponse.RRN} · trace{' '}
                  {evaluation.payload.posResponse.traceNumber}.
                </Text>
                <TouchableOpacity
                  style={styles.recoveryButton}
                  onPress={handleSalvage}
                  disabled={recoveryBusy}
                  testID="failed-payment-salvage-button">
                  <Text style={styles.recoveryButtonText}>
                    {recoveryBusy ? 'Procesando…' : 'Reclasificar como aprobada'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Line
                label="Reclasificación"
                value={
                  record.status === 'open'
                    ? `No elegible (${evaluation?.reason ?? '—'})`
                    : null
                }
                styles={styles}
              />
            )}
            <Line
              label="Orden backend"
              value={record.salvage?.displayOrderNumber}
              styles={styles}
            />
            <Line
              label="Último error de reintento"
              value={record.salvage?.retryError}
              styles={styles}
            />
            {canRetryOrder ? (
              confirmingRetry ? (
                <>
                  <Text style={styles.recoveryWarning}>
                    {duplicateRisk === 'possible_duplicate'
                      ? '⚠ El registro original murió sin respuesta del servidor: la orden PUDO haberse creado. Verifica en el panel del backend que no exista una orden con POS ref ' +
                        (record.salvage?.payload?.posReference ??
                          record.payment?.posReference ??
                          '—') +
                        ' antes de confirmar.'
                      : 'El backend rechazó el registro original, no debería existir orden previa. ¿Confirmar el reintento?'}
                  </Text>
                  <TouchableOpacity
                    style={styles.recoveryButton}
                    onPress={handleRetryOrder}
                    disabled={recoveryBusy}
                    testID="failed-payment-retry-confirm-button">
                    <Text style={styles.recoveryButtonText}>Confirmar reintento</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.recoveryButton}
                  onPress={() => setConfirmingRetry(true)}
                  disabled={recoveryBusy}
                  testID="failed-payment-retry-button">
                  <Text style={styles.recoveryButtonText}>
                    Reintentar registro de orden
                  </Text>
                </TouchableOpacity>
              )
            ) : null}
            {recoveryMessage ? (
              <Text style={styles.recoveryWarning} testID="failed-payment-recovery-message">
                {recoveryMessage}
              </Text>
            ) : null}
          </DetailSection>

          <DetailSection title="Cliente" styles={styles}>
            <Line label="Nombre" value={customerName || null} styles={styles} />
            <Line label="Documento" value={record.customer?.documentId} styles={styles} />
            <Line label="Teléfono" value={record.customer?.phone} styles={styles} />
            <Line label="Email" value={record.customer?.email} styles={styles} />
            {!record.customer ? (
              <Text style={styles.line}>Sin datos de cliente.</Text>
            ) : null}
          </DetailSection>

          <DetailSection title="Pedido" styles={styles}>
            <Line
              label="Total Bs"
              value={record.order?.totals.totalVes}
              styles={styles}
            />
            <Line
              label="Total USD"
              value={record.order?.totals.totalUsd}
              styles={styles}
            />
            <Line label="Reserva" value={record.order?.reservationId} styles={styles} />
            <Line label="Tipo" value={record.order?.orderType} styles={styles} />
            <Line label="Mesa/localizador" value={record.order?.tableNumber} styles={styles} />
            {(record.order?.lines ?? []).map((line, index) => (
              <Text key={`${line.productId}-${index}`} style={styles.line}>
                • {line.productId} × {line.quantity} @ {line.unitPrice}
              </Text>
            ))}
            {!record.order ? (
              <Text style={styles.line}>Sin datos de pedido.</Text>
            ) : null}
          </DetailSection>

          <DetailSection title="Pago" styles={styles}>
            <Line label="Método" value={record.payment?.paymentMethod} styles={styles} />
            <Line label="POS ref" value={record.payment?.posReference} styles={styles} />
            <Line
              label="Ref. móvil"
              value={record.payment?.mobileReference}
              styles={styles}
            />
            <Line label="Banco" value={record.payment?.bankName} styles={styles} />
            <Line label="Cédula pago" value={record.payment?.cedula} styles={styles} />
          </DetailSection>

          <DetailSection title="Error" styles={styles}>
            <Line label="Código" value={record.errorReason} styles={styles} />
            <Line label="Mensaje" value={record.errorMessage} styles={styles} />
          </DetailSection>

          <DetailSection title="JSON capturado" styles={styles}>
            {record.rawJson ? (
              <Text style={styles.mono} selectable>
                {record.rawJson}
              </Text>
            ) : (
              <Text style={styles.line}>Sin JSON capturado.</Text>
            )}
          </DetailSection>
        </ScrollView>
      )}
    </KioskScreenLayout>
  );
}
