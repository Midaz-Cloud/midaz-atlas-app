import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { getKioskUploadsBaseUrl, showKioskDevUi, shouldUseMockApi } from '@shared/config';
import {
  isUsbSerialModuleAvailable,
  useEcrConnectionOptional,
  useEcrUsbDiagnostic,
} from '@shared/peripherals/ecr';
import { useSessionLocale } from '@shared/i18n';
import { useKioskBootstrap, useKioskSession } from '@shared/session';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return value.trim() || '—';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type DebugRowProps = {
  label: string;
  value: unknown;
  warn?: boolean;
};

function DebugRow({ label, value, warn }: DebugRowProps) {
  const text = formatValue(value);
  return (
    <Text style={styles.line}>
      {label}:{' '}
      <Text style={[styles.value, warn && styles.warn]} numberOfLines={3}>
        {text}
      </Text>
    </Text>
  );
}

/**
 * Dev/demo overlay: full kiosk config snapshot for troubleshooting remote images.
 */
export function HomeKioskConfigDebugPanel() {
  const { snapshot } = useKioskBootstrap();
  const { runtimeConfig } = useKioskSession();
  const ecr = useEcrConnectionOptional();
  const usbDiag = useEcrUsbDiagnostic();
  const { locale, languageSwitcherEnabled, enabledLocales } = useSessionLocale();

  if (!showKioskDevUi()) {
    return null;
  }

  const raw = runtimeConfig?.raw;
  const rawAppearance = raw?.appearance;
  const appearance = snapshot?.appearance;
  const operational = snapshot?.operational;
  const appearanceKeys = rawAppearance ? Object.keys(rawAppearance) : [];
  const missingPickupKey = rawAppearance != null && !('pickupImage' in rawAppearance);
  const missingInStoreKey = rawAppearance != null && !('inStoreImage' in rawAppearance);

  return (
    <View style={styles.panel} testID="introduction-home-config-debug">
      <Text style={styles.title}>Config kiosco (debug)</Text>
      <Text style={styles.meta}>
        API: {shouldUseMockApi() ? 'mock' : 'live'} · uploads: {getKioskUploadsBaseUrl()}
      </Text>

      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        persistentScrollbar>
        <Text style={styles.section}>Sesión</Text>
        <DebugRow label="locale activo" value={locale} />
        <DebugRow label="languages config" value={rawAppearance?.languages} />
        <DebugRow label="enabledLocales" value={enabledLocales} />
        <DebugRow label="selector idioma" value={languageSwitcherEnabled} />

        <Text style={styles.section}>Operacional</Text>
        <DebugRow label="foodServiceEnabled" value={raw?.foodServiceEnabled} />
        <DebugRow
          label="orderTypeSelectionEnabled"
          value={operational?.orderTypeSelectionEnabled}
        />
        <DebugRow label="tableFieldEnabled" value={raw?.tableFieldEnabled} />
        <DebugRow label="printQrEnabled" value={raw?.printQrEnabled} />
        <DebugRow label="comandaModel" value={raw?.comandaModel} />
        <DebugRow label="enabledPaymentMethods" value={raw?.enabledPaymentMethods} />
        <DebugRow
          label="pagoMovilAccount"
          value={raw?.pagoMovilAccount ? 'configurada' : 'null (oculta pago móvil en live)'}
        />

        <Text style={styles.section}>POS (ECR USB)</Text>
        <DebugRow label="UsbSerialModule" value={isUsbSerialModuleAvailable() ? 'presente' : 'ausente'} />
        <DebugRow label="usesNativeUsb" value={ecr?.usesNativeUsb} />
        <DebugRow label="isConnected" value={ecr?.isConnected} />
        <DebugRow label="isConnecting" value={ecr?.isConnecting} />
        <DebugRow label="ecr.error" value={ecr?.error} warn={Boolean(ecr?.error)} />

        <Text style={styles.section}>USB diagnóstico (ECR)</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.line}>modo diagnóstico</Text>
          <Switch
            value={usbDiag.enabled}
            onValueChange={(value) => void usbDiag.setEnabled(value)}
            trackColor={{ false: '#555', true: brand.gold }}
          />
        </View>
        <TouchableOpacity onPress={usbDiag.clearLogs}>
          <Text style={styles.link}>Limpiar logs USB</Text>
        </TouchableOpacity>
        {usbDiag.lastSnapshot ? (
          <>
            <DebugRow label="bytes RX" value={usbDiag.lastSnapshot.totalBytes} />
            <DebugRow label="chunks" value={usbDiag.lastSnapshot.chunkCount} />
            <DebugRow label="ensamblado (ms)" value={usbDiag.lastSnapshot.assemblyMs} />
            <DebugRow label="chars payload" value={usbDiag.lastSnapshot.payloadChars} />
            <DebugRow
              label="JSON estricto"
              value={usbDiag.lastSnapshot.strictJsonValid}
              warn={!usbDiag.lastSnapshot.strictJsonValid}
            />
            <DebugRow label="responseCode 00" value={usbDiag.lastSnapshot.hasResponseCode00} />
            <DebugRow label="APPROVED hint" value={usbDiag.lastSnapshot.hasApprovedHint} />
            <DebugRow
              label="VID:PID"
              value={`0x${usbDiag.lastSnapshot.vid.toString(16)}:0x${usbDiag.lastSnapshot.pid.toString(16)}`}
            />
            <DebugRow label="hex preview" value={usbDiag.lastSnapshot.hexPreview} />
          </>
        ) : (
          <Text style={styles.meta}>Sin captura USB aún (realiza un pago POS).</Text>
        )}
        {usbDiag.recentLogs.length > 0 ? (
          <>
            <Text style={styles.subsection}>Logs DIAG recientes</Text>
            {usbDiag.recentLogs.slice(0, 8).map((line, index) => (
              <Text key={`${index}-${line.slice(0, 24)}`} style={styles.logLine} numberOfLines={2}>
                {line}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>Appearance · rutas API (raw)</Text>
        <DebugRow label="appearance keys" value={appearanceKeys} />
        {(missingPickupKey || missingInStoreKey) && (
          <Text style={styles.warnLine}>
            Caché/config antigua: faltan pickupImage o inStoreImage. Reinicia la app tras
            actualizar.
          </Text>
        )}
        <DebugRow label="title" value={rawAppearance?.title} />
        <DebugRow label="subtitle" value={rawAppearance?.subtitle} />
        <DebugRow label="coverImage" value={rawAppearance?.coverImage} />
        <DebugRow
          label="pickupImage (raw)"
          value={
            rawAppearance && 'pickupImage' in rawAppearance
              ? rawAppearance.pickupImage
              : appearance?.pickupImagePath
          }
          warn={!appearance?.pickupImagePath && !rawAppearance?.pickupImage}
        />
        <DebugRow
          label="inStoreImage (raw)"
          value={
            rawAppearance && 'inStoreImage' in rawAppearance
              ? rawAppearance.inStoreImage
              : appearance?.inStoreImagePath
          }
          warn={!appearance?.inStoreImagePath && !rawAppearance?.inStoreImage}
        />
        <DebugRow label="primaryColor" value={rawAppearance?.primaryColor} />
        <DebugRow label="secondaryColor" value={rawAppearance?.secondaryColor} />
        <DebugRow label="titleColor" value={rawAppearance?.titleColor} />
        <DebugRow label="subtitleColor" value={rawAppearance?.subtitleColor} />
        <DebugRow label="translations" value={rawAppearance?.translations} />

        <Text style={styles.section}>Appearance · URLs resueltas</Text>
        <DebugRow label="coverImageUrl" value={appearance?.coverImageUrl} />
        <DebugRow
          label="pickupImageUrl"
          value={appearance?.pickupImageUrl}
          warn={!appearance?.pickupImageUrl}
        />
        <DebugRow
          label="inStoreImageUrl"
          value={appearance?.inStoreImageUrl}
          warn={!appearance?.inStoreImageUrl}
        />

        <Text style={styles.section}>Organización</Text>
        <DebugRow label="name" value={raw?.organization?.name} />
        <DebugRow label="logo (raw)" value={raw?.organization?.logo} />
        <DebugRow label="logoUrl" value={snapshot?.organization.logoUrl} />
        <DebugRow label="primaryCurrency" value={raw?.organization?.primaryCurrency} />
        <DebugRow label="declaresTaxes (raw)" value={raw?.organization?.declaresTaxes} />
        <DebugRow label="declaresTaxes (snapshot)" value={snapshot?.organization.declaresTaxes} />

        {raw ? (
          <>
            <Text style={styles.section}>Config id</Text>
            <DebugRow label="kioskDeviceId" value={raw.kioskDeviceId} />
            <DebugRow label="configEtag" value={snapshot?.configEtag} />
            <DebugRow label="productCount" value={snapshot?.productCount} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: kioskScale(1),
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: kioskScale(14),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
    maxHeight: kioskScale(420),
    gap: kioskScale(6),
  },
  scroll: {
    maxHeight: kioskScale(360),
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
    marginTop: kioskScale(6),
  },
  subsection: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(15),
    fontWeight: '600',
    marginTop: kioskScale(4),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: kioskScale(8),
  },
  link: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(14),
    textDecorationLine: 'underline',
    marginBottom: kioskScale(4),
  },
  logLine: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: kioskScale(12),
    fontFamily: 'monospace',
  },
  line: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(15),
  },
  value: {
    fontWeight: '600',
  },
  warn: {
    color: '#ffb4b4',
  },
  warnLine: {
    ...bodyTextStyle(),
    color: '#ffb4b4',
    fontSize: kioskScale(14),
    fontWeight: '600',
  },
  meta: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: kioskScale(14),
  },
});
