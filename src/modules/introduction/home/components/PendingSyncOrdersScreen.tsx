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
import { useKioskConnectivity } from '@shared/connectivity';
import {
  listOrderOutbox,
  requeueOrderOutbox,
  type OrderOutboxRecord,
  type OrderOutboxStatus,
} from '@shared/persistence';
import { printOrderTicket } from '@shared/peripherals/printer';
import { drainOrderOutbox, parseOutboxOrderPayload, useOrderSyncStatus } from '@shared/sync';
import {
  bodyTextStyle,
  colorWithAlpha,
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

const STATUS_LABELS: Record<OrderOutboxStatus, string> = {
  queued: 'En cola',
  syncing: 'Enviando',
  synced: 'Sincronizada',
  failed: 'Rechazada',
};

const CONNECTIVITY_LABELS = {
  unknown: 'Comprobando conexión…',
  online: 'Conectado al servidor',
  degraded: 'Conexión inestable',
  offline: 'Sin conexión con el servidor',
} as const;

export type PendingSyncOrdersScreenProps = {
  onBack: () => void;
};

function formatLocalDateTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/**
 * Ventas cobradas sin backend (o que el backend rechazó). Las `queued` se envían
 * solas al volver la red; aquí se fuerza el envío, se reencola una rechazada tras
 * corregir la causa o se reimprime el ticket.
 */
export function PendingSyncOrdersScreen({ onBack }: PendingSyncOrdersScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const connectivity = useKioskConnectivity();
  const sync = useOrderSyncStatus();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderOutboxRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listOrderOutbox({ limit: 100 });
      setItems(rows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, sync.pending, sync.failed, sync.draining]);

  const handleSyncNow = useCallback(async () => {
    setMessage(null);
    const summary = await drainOrderOutbox({ force: true });
    setMessage(
      summary.stoppedBy === 'network'
        ? 'Sin conexión: se reintentará solo al volver la red.'
        : `Enviadas: ${summary.synced}. Rechazadas: ${summary.failed}.`,
    );
    await load();
  }, [load]);

  const handleRequeue = useCallback(
    async (record: OrderOutboxRecord) => {
      setBusyId(record.id);
      try {
        await requeueOrderOutbox(record.id);
        await drainOrderOutbox({ force: true });
      } finally {
        setBusyId(null);
        await load();
      }
    },
    [load],
  );

  const handleReprint = useCallback(async (record: OrderOutboxRecord) => {
    const payload = parseOutboxOrderPayload(record.payload);
    if (!payload) {
      setMessage('No hay datos guardados para reimprimir este ticket.');
      return;
    }
    setBusyId(record.id);
    try {
      await printOrderTicket({
        ...payload.ticket,
        displayOrderNumber: record.syncedDisplayNumber ?? record.localNumber,
        footerNote: record.status === 'synced' ? undefined : 'Copia. Pedido registrado sin conexion.',
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo imprimir');
    } finally {
      setBusyId(null);
    }
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, paddingHorizontal: kioskScale(40), paddingTop: kioskScale(16), width: '100%' },
        headerBlock: { marginBottom: kioskScale(20), gap: kioskScale(10), alignItems: 'center' },
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
        syncButton: {
          marginTop: kioskScale(8),
          paddingHorizontal: kioskScale(28),
          paddingVertical: kioskScale(14),
          borderRadius: kioskScale(999),
          backgroundColor: colors.priceAccent,
        },
        syncButtonText: { ...displayTextStyle({ fontWeight: '700' }), fontSize: kioskScale(22), color: '#FFFFFF' },
        listContent: { paddingBottom: kioskScale(40), gap: kioskScale(16) },
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(24),
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
          paddingVertical: kioskScale(20),
          paddingHorizontal: kioskScale(24),
          gap: kioskScale(8),
          ...kioskScreenShadows.menuCard,
        },
        cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: kioskScale(12) },
        cardRef: { ...displayTextStyle({ fontWeight: '700' }), fontSize: kioskScale(28), color: colors.title },
        badge: {
          paddingHorizontal: kioskScale(14),
          paddingVertical: kioskScale(6),
          borderRadius: kioskScale(999),
          backgroundColor: colorWithAlpha(colors.priceAccent, 0.12),
          borderWidth: kioskScale(2),
          borderColor: colorWithAlpha(colors.priceAccent, 0.28),
        },
        badgeText: { ...bodyTextStyle({ fontWeight: '700' }), fontSize: kioskScale(16), color: colors.title },
        cardMeta: { ...bodyTextStyle(), fontSize: kioskScale(19), color: colors.title, opacity: 0.7 },
        actions: { flexDirection: 'row', gap: kioskScale(24), marginTop: kioskScale(4) },
        action: { ...displayTextStyle({ fontWeight: '700' }), fontSize: kioskScale(20), color: colors.priceAccent },
        message: { ...bodyTextStyle(), fontSize: kioskScale(20), color: colors.title, textAlign: 'center' },
        empty: {
          ...bodyTextStyle(),
          fontSize: kioskScale(22),
          color: colors.title,
          opacity: 0.7,
          textAlign: 'center',
          marginTop: kioskScale(32),
        },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="pending-sync-orders-screen"
      showPattern
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="pending-sync-orders-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Ventas por sincronizar</Text>
          <Text style={styles.subtitle}>
            {CONNECTIVITY_LABELS[connectivity.status]} · En cola: {sync.pending} · Rechazadas:{' '}
            {sync.failed}
          </Text>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncNow}
            disabled={sync.draining}
            testID="pending-sync-now">
            <Text style={styles.syncButtonText}>
              {sync.draining ? 'Enviando…' : 'Sincronizar ahora'}
            </Text>
          </TouchableOpacity>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.priceAccent} />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No hay ventas guardadas sin conexión.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card} testID={`pending-sync-row-${item.id}`}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardRef}>
                    {item.localNumber}
                    {item.syncedDisplayNumber ? ` → ${item.syncedDisplayNumber}` : ''}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  Cobro: {formatLocalDateTime(item.paidAt)} · {item.paymentMethod}
                  {item.fiscalInvoiceNumber ? ` · Factura ${item.fiscalInvoiceNumber}` : ''}
                  {item.posReference ? ` · Ref ${item.posReference}` : ''}
                </Text>
                {item.lastError && item.status !== 'synced' ? (
                  <Text style={styles.cardMeta} numberOfLines={3}>
                    Intentos: {item.attempts} · {item.lastError}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  {item.status === 'failed' ? (
                    <TouchableOpacity
                      onPress={() => void handleRequeue(item)}
                      disabled={busyId != null}
                      testID={`pending-sync-requeue-${item.id}`}>
                      <Text style={styles.action}>Reencolar</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => void handleReprint(item)}
                    disabled={busyId != null}
                    testID={`pending-sync-reprint-${item.id}`}>
                    <Text style={styles.action}>Reimprimir ticket</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </KioskScreenLayout>
  );
}
