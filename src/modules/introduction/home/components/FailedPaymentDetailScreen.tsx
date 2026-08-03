import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KioskScreenLayout } from '@shared/components';
import {
  getFailedPayment,
  type FailedPaymentRecord,
} from '@shared/persistence';
import { bodyTextStyle, displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

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
