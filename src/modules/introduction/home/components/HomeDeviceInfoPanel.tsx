import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {
  getKioskApiBaseUrl,
  getKioskDeviceSerialOverride,
  showKioskDevUi,
  shouldUseMockApi,
} from '@shared/config';
import { getKioskDeviceProfile, type KioskDeviceProfile } from '@shared/device';
import { isUsbSerialModuleAvailable, useEcrConnectionOptional } from '@shared/peripherals/ecr';
import { useKioskBootstrap, useKioskSession } from '@shared/session';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

type DeviceDiagnostics = {
  profile: KioskDeviceProfile;
};

type InfoRowProps = {
  label: string;
  value: string;
  warn?: boolean;
  highlight?: boolean;
};

function InfoRow({ label, value, warn, highlight }: InfoRowProps) {
  return (
    <Text style={styles.line}>
      {label}:{' '}
      <Text
        style={[styles.value, warn && styles.warn, highlight && styles.highlight]}
        selectable>
        {value || '—'}
      </Text>
    </Text>
  );
}

/**
 * Home overlay: hardware vs API serial (login/config). Visible in __DEV__ / demo.
 */
export function HomeDeviceInfoPanel() {
  const { snapshot, deviceSerial: bootstrapSerial } = useKioskBootstrap();
  const { deviceSerial: sessionSerial, runtimeConfig, status } = useKioskSession();
  const ecr = useEcrConnectionOptional();
  const [data, setData] = useState<DeviceDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serialOverride = getKioskDeviceSerialOverride();
  const apiSerial = sessionSerial ?? bootstrapSerial ?? data?.profile.serialNumber ?? '—';
  const apiMode = shouldUseMockApi() ? 'mock' : 'live';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getKioskDeviceProfile();
        if (!cancelled) {
          setData({ profile });
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setData(null);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!showKioskDevUi()) {
    return null;
  }

  const profile = data?.profile;
  const hardwareSerial = profile?.hardwareSerial || '—';
  const serialMismatch =
    Boolean(serialOverride) && hardwareSerial !== '—' && apiSerial !== hardwareSerial;

  return (
    <View style={styles.panel} testID="introduction-home-device-info">
      <Text style={styles.title}>Dispositivo · API</Text>
      <Text style={styles.meta}>
        {apiMode} · {getKioskApiBaseUrl()}
      </Text>

      {serialOverride ? (
        <Text style={styles.overrideBanner}>
          Override .env activo: el backend siempre recibe «{serialOverride}», no el serial del
          equipo. Quita KIOSK_DEVICE_SERIAL_OVERRIDE y recompila para usar el hardware.
        </Text>
      ) : null}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : profile == null ? (
        <ActivityIndicator color={brand.cream} size="small" />
      ) : (
        <ScrollView
          style={styles.scroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          persistentScrollbar>
          <Text style={styles.section}>Serial (login / config)</Text>
          <InfoRow
            label="Enviado al API"
            value={apiSerial}
            highlight
            warn={Boolean(serialOverride)}
          />
          <InfoRow label="Hardware (DeviceInfo)" value={hardwareSerial} warn={serialMismatch} />
          <InfoRow
            label="Resuelto en app"
            value={profile.serialNumber}
            warn={profile.serialNumber !== hardwareSerial}
          />

          <Text style={styles.section}>Equipo</Text>
          <InfoRow label="uniqueId" value={profile.uniqueId} />
          <InfoRow label="Marca / modelo" value={`${profile.brand} ${profile.model}`} />
          <InfoRow
            label="Android"
            value={`${profile.systemVersion} · app ${profile.appVersion} (${profile.buildNumber})`}
          />
          <InfoRow label="DeviceId (RN)" value={DeviceInfo.getDeviceId()} />

          {status === 'ready' && runtimeConfig?.raw ? (
            <>
              <Text style={styles.section}>Kiosco registrado</Text>
              <InfoRow label="kioskDeviceId" value={runtimeConfig.raw.kioskDeviceId} />
              {snapshot?.configEtag ? (
                <InfoRow label="configEtag" value={snapshot.configEtag} />
              ) : null}
            </>
          ) : (
            <Text style={styles.meta}>Bootstrap: {status}</Text>
          )}

          {snapshot ? (
            <>
              <Text style={styles.section}>Config cargada</Text>
              <InfoRow label="Organización" value={snapshot.organization.name} />
              <InfoRow
                label="Pagos"
                value={snapshot.operational.enabledPaymentMethods.join(', ') || '—'}
              />
            </>
          ) : null}

          {snapshot?.operational.enabledPaymentMethods.includes('debito') ? (
            <>
              <Text style={styles.section}>POS</Text>
              <InfoRow
                label="UsbSerialModule"
                value={isUsbSerialModuleAvailable() ? 'sí' : 'no (rebuild)'}
              />
              {ecr ? (
                <InfoRow
                  label="USB"
                  value={
                    ecr.isConnected
                      ? 'conectado'
                      : ecr.isConnecting
                        ? 'conectando…'
                        : 'desconectado'
                  }
                />
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderWidth: kioskScale(1),
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: kioskScale(14),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
    maxHeight: kioskScale(380),
    gap: kioskScale(6),
  },
  scroll: {
    maxHeight: kioskScale(320),
  },
  title: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(20),
    fontWeight: '700',
  },
  section: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(17),
    fontWeight: '600',
    marginTop: kioskScale(8),
  },
  line: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(15),
  },
  value: {
    fontWeight: '600',
  },
  highlight: {
    color: '#b8e0ff',
  },
  meta: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: kioskScale(14),
  },
  overrideBanner: {
    ...bodyTextStyle(),
    color: '#ffe08a',
    backgroundColor: 'rgba(255, 160, 0, 0.22)',
    padding: kioskScale(8),
    borderRadius: kioskScale(6),
    fontSize: kioskScale(14),
    fontWeight: '600',
  },
  warn: {
    color: '#ffb4b4',
  },
  error: {
    ...bodyTextStyle(),
    color: '#ffb4b4',
    fontSize: kioskScale(15),
  },
});
