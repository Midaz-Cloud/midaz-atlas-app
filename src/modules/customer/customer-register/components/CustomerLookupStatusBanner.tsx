import { StyleSheet, Text, View } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type CustomerLookupStatus =
  | { kind: 'prefill'; source: 'cne' | 'org'; name: string; documentId: string }
  | { kind: 'not_found'; documentId: string }
  | { kind: 'error'; message: string; documentId: string };

type Props = {
  status: CustomerLookupStatus;
  /** Fallback when status was built without documentId */
  documentId?: string;
};

/**
 * Dev/demo overlay shown in CustomerRegisterScreen to indicate whether
 * lookup returned prefill data, a "not found", or an error.
 */
export function CustomerLookupStatusBanner({ status, documentId: documentIdFallback }: Props) {
  if (!showKioskDevUi()) {
    return null;
  }

  const documentId = status.documentId || documentIdFallback || '—';

  return (
    <View style={styles.banner} pointerEvents="none" testID="customer-lookup-status-banner">
      <Text style={styles.title}>Lookup cliente (debug)</Text>
      {status.kind === 'prefill' ? (
        <>
          <Text style={styles.line}>
            Estado:{' '}
            <Text style={[styles.value, styles.ok]}>
              pre-fill ({status.source === 'org' ? 'en org' : 'CNE/SAIME'})
            </Text>
          </Text>
          <Text style={styles.line}>
            Documento: <Text style={styles.value}>{documentId}</Text>
          </Text>
          <Text style={styles.line}>
            Nombre sugerido: <Text style={styles.value}>{status.name}</Text>
          </Text>
        </>
      ) : status.kind === 'not_found' ? (
        <>
          <Text style={styles.line}>
            Estado:{' '}
            <Text style={[styles.value, styles.warn]}>no encontrado — registro manual</Text>
          </Text>
          <Text style={styles.line}>
            Documento: <Text style={styles.value}>{documentId}</Text>
          </Text>
        </>
      ) : status.kind === 'error' ? (
        <>
          <Text style={styles.line}>
            Estado: <Text style={[styles.value, styles.error]}>error al consultar</Text>
          </Text>
          <Text style={styles.line}>
            Documento: <Text style={styles.value}>{documentId}</Text>
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {status.message}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.line}>
            Estado: <Text style={[styles.value, styles.warn]}>estado desconocido</Text>
          </Text>
          <Text style={styles.line}>
            Documento: <Text style={styles.value}>{documentId}</Text>
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: kioskScale(1),
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: kioskScale(14),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
    maxWidth: kioskScale(720),
    gap: kioskScale(6),
    alignSelf: 'stretch',
  },
  title: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(20),
    fontWeight: '700',
  },
  line: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(18),
  },
  value: {
    fontWeight: '600',
  },
  ok: {
    color: '#8fff8f',
  },
  warn: {
    color: brand.gold,
  },
  error: {
    color: '#ffb4b4',
  },
  meta: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: kioskScale(15),
  },
});
