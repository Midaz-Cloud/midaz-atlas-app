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
  type FailedPaymentSummary,
} from '@shared/persistence';
import { bodyTextStyle, displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils';

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
                <Text style={styles.rowRef}>{item.displayRef}</Text>
                <Text style={styles.rowDate}>{formatLocalDateTime(item.createdAt)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </KioskScreenLayout>
  );
}
