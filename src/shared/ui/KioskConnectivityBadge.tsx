import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useKioskConnectivity } from '@shared/connectivity';
import { useOrderSyncStatus } from '@shared/sync';
import { bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

/**
 * Aviso discreto de conexión: solo aparece sin backend, con conexión inestable o
 * con ventas guardadas que faltan por enviar. En línea y al día no ocupa nada.
 */
export function KioskConnectivityBadge() {
  const { t } = useTranslation('session');
  const { status } = useKioskConnectivity();
  const { pending } = useOrderSyncStatus();

  const offline = status === 'offline';
  const degraded = status === 'degraded';
  if (!offline && !degraded && pending === 0) {
    return null;
  }

  const label = offline
    ? t('connectivity.offline')
    : degraded
      ? t('connectivity.degraded')
      : t('connectivity.syncing');

  return (
    <View
      style={[styles.badge, offline ? styles.offline : styles.warn]}
      pointerEvents="none"
      testID="kiosk-connectivity-badge">
      <View style={[styles.dot, offline ? styles.dotOffline : styles.dotWarn]} />
      <Text style={styles.text}>
        {label}
        {pending > 0 ? ` · ${t('connectivity.pending', { count: pending })}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: kioskScale(10),
    paddingHorizontal: kioskScale(18),
    paddingVertical: kioskScale(8),
    borderRadius: kioskScale(999),
  },
  offline: { backgroundColor: 'rgba(185, 28, 28, 0.9)' },
  warn: { backgroundColor: 'rgba(180, 83, 9, 0.9)' },
  dot: { width: kioskScale(12), height: kioskScale(12), borderRadius: kioskScale(6) },
  dotOffline: { backgroundColor: '#FECACA' },
  dotWarn: { backgroundColor: '#FDE68A' },
  text: {
    ...bodyTextStyle({ fontWeight: '700' }),
    fontSize: kioskScale(18),
    color: '#FFFFFF',
  },
});
