import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { salvageFailedPayments } from '@modules/payment/recovery';
import { KioskScreenLayout } from '@shared/components';
import {
  listFailedPaymentSummaries,
  type FailedPaymentStatus,
  type FailedPaymentSummary,
} from '@shared/persistence';
import { bodyTextStyle, displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

const STATUS_LABELS: Record<FailedPaymentStatus, string> = {
  open: 'Abierto',
  salvaged: 'Recuperada',
  retry_pending: 'Reintento pendiente',
  retried_ok: 'Orden registrada',
  retry_failed: 'Reintento falló',
  dismissed: 'Descartada',
};

export type FailedPaymentsListScreenProps = {
  onBack: () => void;
  onSelect: (id: number) => void;
};

function formatLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export function FailedPaymentsListScreen({
  onBack,
  onSelect,
}: FailedPaymentsListScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FailedPaymentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salvaging, setSalvaging] = useState(false);
  const [salvageSummary, setSalvageSummary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listFailedPaymentSummaries();
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSalvage = useCallback(async () => {
    setSalvaging(true);
    setSalvageSummary(null);
    try {
      const result = await salvageFailedPayments();
      setSalvageSummary(
        result.salvaged.length > 0
          ? `${result.salvaged.length} pago(s) recuperados al lote de cierre · ${result.skipped.length} sin cambios`
          : 'Ninguna fila abierta corresponde a un pago aprobado.',
      );
      await load();
    } catch (err) {
      setSalvageSummary(
        `Error al recuperar: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSalvaging(false);
    }
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: kioskScale(40),
          paddingTop: kioskScale(24),
          width: '100%',
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(40),
          lineHeight: kioskScale(48),
          color: colors.title,
          textAlign: 'center',
          marginBottom: kioskScale(8),
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          color: colors.menuSectionMuted,
          textAlign: 'center',
          marginBottom: kioskScale(24),
        },
        row: {
          paddingVertical: kioskScale(20),
          paddingHorizontal: kioskScale(24),
          borderBottomWidth: kioskScale(2),
          borderBottomColor: colors.productDetailBorder,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: kioskScale(16),
        },
        rowRef: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(28),
          color: colors.title,
        },
        rowLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScale(12),
          flexShrink: 1,
        },
        badge: {
          paddingHorizontal: kioskScale(12),
          paddingVertical: kioskScale(4),
          borderRadius: kioskScale(12),
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
        },
        badgeSalvaged: {
          borderColor: colors.priceAccent,
        },
        badgeText: {
          ...bodyTextStyle(),
          fontSize: kioskScale(16),
          color: colors.menuSectionMuted,
        },
        badgeTextSalvaged: {
          color: colors.priceAccent,
        },
        salvageButton: {
          alignSelf: 'center',
          paddingHorizontal: kioskScale(28),
          paddingVertical: kioskScale(14),
          borderRadius: kioskScale(16),
          borderWidth: kioskScale(2),
          borderColor: colors.priceAccent,
          marginBottom: kioskScale(16),
        },
        salvageButtonText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(22),
          color: colors.priceAccent,
        },
        salvageSummary: {
          ...bodyTextStyle(),
          fontSize: kioskScale(20),
          color: colors.menuSectionMuted,
          textAlign: 'center',
          marginBottom: kioskScale(16),
        },
        rowDate: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          color: colors.menuSectionMuted,
          flexShrink: 1,
          textAlign: 'right',
        },
        empty: {
          ...bodyTextStyle(),
          fontSize: kioskScale(24),
          color: colors.menuSectionMuted,
          textAlign: 'center',
          marginTop: kioskScale(48),
        },
        error: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          color: colors.title,
          textAlign: 'center',
          marginTop: kioskScale(24),
        },
        center: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="failed-payments-list-screen"
      showPattern
      contentAlign="stretch"
      onBack={onBack}
      backButtonTestID="failed-payments-list-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <Text style={styles.title}>Pagos fallidos</Text>
        <Text style={styles.subtitle}>
          Selecciona un registro para ver el detalle.
        </Text>

        <TouchableOpacity
          style={styles.salvageButton}
          onPress={handleSalvage}
          disabled={salvaging}
          testID="failed-payments-salvage-button">
          <Text style={styles.salvageButtonText}>
            {salvaging ? 'Recuperando…' : 'Recuperar aprobadas'}
          </Text>
        </TouchableOpacity>
        {salvageSummary ? (
          <Text style={styles.salvageSummary} testID="failed-payments-salvage-summary">
            {salvageSummary}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.priceAccent} />
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No hay pagos fallidos registrados.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onSelect(item.id)}
                testID={`failed-payment-row-${item.id}`}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowRef}>{item.displayRef}</Text>
                  <View
                    style={[
                      styles.badge,
                      item.status !== 'open' ? styles.badgeSalvaged : null,
                    ]}>
                    <Text
                      style={[
                        styles.badgeText,
                        item.status !== 'open' ? styles.badgeTextSalvaged : null,
                      ]}>
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowDate}>{formatLocalDateTime(item.createdAt)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </KioskScreenLayout>
  );
}
