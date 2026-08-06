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

import { KioskScreenLayout } from '@shared/components';
import {
  listFailedPaymentSummaries,
  type FailedPaymentStatus,
  type FailedPaymentSummary,
} from '@shared/persistence';
import {
  bodyTextStyle,
  colorWithAlpha,
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: kioskScale(40),
          paddingTop: kioskScale(16),
          width: '100%',
        },
        headerBlock: {
          marginBottom: kioskScale(28),
          gap: kioskScale(10),
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(42),
          lineHeight: kioskScale(50),
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          lineHeight: kioskScale(30),
          color: colors.title,
          textAlign: 'center',
          opacity: 0.72,
        },
        listContent: {
          paddingBottom: kioskScale(40),
          gap: kioskScale(16),
        },
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
          paddingVertical: kioskScale(22),
          paddingHorizontal: kioskScale(24),
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScale(18),
          ...kioskScreenShadows.menuCard,
        },
        cardAccent: {
          width: kioskScale(8),
          alignSelf: 'stretch',
          borderRadius: kioskScale(8),
          backgroundColor: colors.priceAccent,
        },
        cardBody: {
          flex: 1,
          gap: kioskScale(10),
        },
        cardTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: kioskScale(12),
        },
        cardRef: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(28),
          color: colors.title,
          flexShrink: 1,
        },
        badge: {
          paddingHorizontal: kioskScale(14),
          paddingVertical: kioskScale(6),
          borderRadius: kioskScale(999),
          backgroundColor: colorWithAlpha(colors.priceAccent, 0.12),
          borderWidth: kioskScale(2),
          borderColor: colorWithAlpha(colors.priceAccent, 0.28),
        },
        badgeText: {
          ...bodyTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(16),
          color: colors.title,
        },
        cardMeta: {
          ...bodyTextStyle(),
          fontSize: kioskScale(20),
          color: colors.title,
          opacity: 0.7,
        },
        cardAction: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(20),
          color: colors.priceAccent,
        },
        chevron: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(32),
          color: colors.priceAccent,
          paddingLeft: kioskScale(4),
        },
        emptyCard: {
          marginTop: kioskScale(32),
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
          padding: kioskScale(40),
          alignItems: 'center',
          gap: kioskScale(12),
          ...kioskScreenShadows.menuCard,
        },
        emptyTitle: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScale(28),
          color: colors.title,
          textAlign: 'center',
        },
        empty: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          color: colors.title,
          opacity: 0.7,
          textAlign: 'center',
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
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="failed-payments-list-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Órdenes sin registrar</Text>
          <Text style={styles.subtitle}>
            Aquí puedes reintentar el registro de órdenes que ya fueron cobradas
            pero no se guardaron correctamente.
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.priceAccent} />
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Todo en orden</Text>
            <Text style={styles.empty}>
              No hay pagos fallidos registrados en este momento.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => onSelect(item.id)}
                activeOpacity={0.85}
                testID={`failed-payment-row-${item.id}`}>
                <View style={styles.cardAccent} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardRef} numberOfLines={1}>
                      {item.displayRef}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {formatLocalDateTime(item.createdAt)}
                  </Text>
                  <Text style={styles.cardAction}>Revisar</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </KioskScreenLayout>
  );
}
