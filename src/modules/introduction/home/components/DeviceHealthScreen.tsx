import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KioskScreenLayout } from '@shared/components';
import {
  clearKioskRuntimeHealthHistory,
  collectKioskRuntimeHealth,
  formatUptime,
  loadKioskRuntimeHealthHistory,
  recordKioskRuntimeHealthSample,
  type KioskRuntimeHealth,
} from '@shared/telemetry';
import {
  bodyTextStyle,
  colorWithAlpha,
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type DeviceHealthScreenProps = {
  onBack: () => void;
};

function mb(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)} MB`;
}

function deltaMb(from: number | null, to: number | null): string {
  if (from == null || to == null) {
    return '—';
  }
  const diff = Math.round(to - from);
  return `${diff > 0 ? '+' : ''}${diff} MB`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Resumen de la evolución entre la toma más vieja y la más nueva del historial:
 * si el proceso crece con las horas (PSS / heap JS) o el sistema se queda sin
 * RAM, acá se ve sin necesidad de conectar el kiosko por adb.
 */
export function summarizeRuntimeHealthTrend(history: KioskRuntimeHealth[]): string | null {
  if (history.length < 2) {
    return null;
  }
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const spanMs = new Date(last.at).getTime() - new Date(first.at).getTime();
  const spanSec = Number.isFinite(spanMs) && spanMs > 0 ? Math.round(spanMs / 1000) : null;
  const parts = [
    `PSS ${deltaMb(first.pssMb, last.pssMb)}`,
    `heap JS ${deltaMb(first.jsHeapUsedMb, last.jsHeapUsedMb)}`,
    `RAM libre ${deltaMb(first.systemAvailMb, last.systemAvailMb)}`,
  ];
  return `En ${formatUptime(spanSec)} (${history.length} tomas): ${parts.join(' · ')}`;
}

export function DeviceHealthScreen({ onBack }: DeviceHealthScreenProps) {
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [measuring, setMeasuring] = useState(false);
  const [history, setHistory] = useState<KioskRuntimeHealth[]>([]);
  const [current, setCurrent] = useState<KioskRuntimeHealth | null>(null);

  const load = useCallback(async () => {
    const rows = await loadKioskRuntimeHealthHistory();
    setHistory(rows);
    setLoading(false);
  }, []);

  const measureNow = useCallback(async () => {
    setMeasuring(true);
    try {
      const sample = await collectKioskRuntimeHealth();
      setCurrent(sample);
      await recordKioskRuntimeHealthSample(sample);
      await load();
    } finally {
      setMeasuring(false);
    }
  }, [load]);

  useEffect(() => {
    void measureNow();
  }, [measureNow]);

  const handleClear = useCallback(async () => {
    await clearKioskRuntimeHealthHistory();
    await load();
  }, [load]);

  const newestFirst = useMemo(() => [...history].reverse(), [history]);
  const trend = useMemo(() => summarizeRuntimeHealthTrend(history), [history]);

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
        warn: { color: '#B42318', opacity: 1 },
        actionsRow: { flexDirection: 'row', gap: kioskScale(16), marginTop: kioskScale(8) },
        button: {
          paddingHorizontal: kioskScale(28),
          paddingVertical: kioskScale(14),
          borderRadius: kioskScale(999),
          backgroundColor: colors.priceAccent,
        },
        buttonSecondary: {
          backgroundColor: colorWithAlpha(colors.priceAccent, 0.14),
        },
        buttonText: { ...displayTextStyle({ fontWeight: '700' }), fontSize: kioskScale(22), color: '#FFFFFF' },
        buttonTextSecondary: { color: colors.title },
        listContent: { paddingBottom: kioskScale(40), gap: kioskScale(12) },
        card: {
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScale(20),
          borderWidth: kioskScale(2),
          borderColor: colors.productDetailBorder,
          paddingVertical: kioskScale(16),
          paddingHorizontal: kioskScale(24),
          gap: kioskScale(6),
          ...kioskScreenShadows.menuCard,
        },
        cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: kioskScale(12) },
        cardTime: { ...displayTextStyle({ fontWeight: '700' }), fontSize: kioskScale(24), color: colors.title },
        cardMeta: { ...bodyTextStyle(), fontSize: kioskScale(19), color: colors.title, opacity: 0.75 },
        badge: {
          paddingHorizontal: kioskScale(14),
          paddingVertical: kioskScale(6),
          borderRadius: kioskScale(999),
          backgroundColor: 'rgba(180, 35, 24, 0.12)',
          borderWidth: kioskScale(2),
          borderColor: 'rgba(180, 35, 24, 0.3)',
        },
        badgeText: { ...bodyTextStyle({ fontWeight: '700' }), fontSize: kioskScale(16), color: '#B42318' },
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
      testID="device-health-screen"
      showPattern
      contentAlign="top"
      onBack={onBack}
      backButtonTestID="device-health-back"
      contentStyle={{ paddingBottom: insets.bottom }}>
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Salud del equipo</Text>
          <Text style={styles.subtitle} testID="device-health-current">
            {current
              ? `App encendida hace ${formatUptime(current.appUptimeSec)} · Proceso ${mb(current.pssMb)} · Heap JS ${mb(
                  current.jsHeapUsedMb,
                )} / ${mb(current.jsHeapSizeMb)} · RAM libre ${mb(current.systemAvailMb)}`
              : 'Midiendo…'}
          </Text>
          {current?.systemLowMemory ? (
            <Text style={[styles.subtitle, styles.warn]} testID="device-health-low-memory">
              Android reporta memoria baja: está cerrando apps de fondo (p. ej. HkaApp).
            </Text>
          ) : null}
          {trend ? (
            <Text style={styles.subtitle} testID="device-health-trend">
              {trend}
            </Text>
          ) : null}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => void measureNow()}
              disabled={measuring}
              testID="device-health-measure">
              <Text style={styles.buttonText}>{measuring ? 'Midiendo…' : 'Medir ahora'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => void handleClear()}
              disabled={measuring || history.length === 0}
              testID="device-health-clear">
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Borrar historial</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.priceAccent} />
          </View>
        ) : newestFirst.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay tomas guardadas (una cada 5 minutos).</Text>
        ) : (
          <FlatList
            data={newestFirst}
            keyExtractor={(item) => item.at}
            contentContainerStyle={styles.listContent}
            initialNumToRender={12}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item }) => (
              <View style={styles.card} testID="device-health-row">
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTime}>
                    {formatTime(item.at)} · encendida {formatUptime(item.appUptimeSec)}
                  </Text>
                  {item.systemLowMemory ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Memoria baja</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>
                  Proceso {mb(item.pssMb)} · Heap JS {mb(item.jsHeapUsedMb)} / {mb(item.jsHeapSizeMb)}
                  {item.jsGcCount != null ? ` · GC ${item.jsGcCount}` : ''} · RAM libre {mb(item.systemAvailMb)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </KioskScreenLayout>
  );
}
