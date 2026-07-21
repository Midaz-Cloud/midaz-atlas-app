import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import { PaymentMobileQrCode } from './PaymentMobileQrCode';
import { PaymentReadOnlyField } from './PaymentReadOnlyField';

export type PaymentAccountField = {
  label: string;
  value: string;
  testID?: string;
  /** Fila de valor más alta (p. ej. correo Zelle Figma 48:143). */
  tallValue?: boolean;
  /** Ocupa el ancho de la columna (Zelle Figma 48:79–48:143). */
  fullWidth?: boolean;
};

export type PaymentAccountDetailsPanelProps = {
  fields: PaymentAccountField[];
  testID?: string;
  compact?: boolean;
  qrCodeUri?: string | null;
  loadingQr?: boolean;
};

/** Columna de campos + QR (Figma 48:13 · 48:77). */
export function PaymentAccountDetailsPanel({
  fields,
  testID = 'payment-account-details',
  compact = false,
  qrCodeUri,
  loadingQr,
}: PaymentAccountDetailsPanelProps) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.fields, compact && styles.fieldsCompact]}>
        {fields.map((field) => (
          <PaymentReadOnlyField
            key={field.testID ?? `${field.label}-${field.value}`}
            label={field.label}
            value={field.value}
            testID={field.testID}
            tallValue={field.tallValue}
            fullWidth={field.fullWidth}
            compact={compact}
          />
        ))}
      </View>
      <PaymentMobileQrCode qrCodeUri={qrCodeUri} loadingQr={loadingQr} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    maxWidth: kioskScreenLayout.paymentMobileDetailsMaxWidth,
    gap: kioskScreenLayout.paymentPosSectionGap,
  },
  fields: {
    gap: kioskScreenLayout.paymentMobileFieldsGap,
    maxWidth: kioskScreenLayout.paymentMobileFieldsColumnWidth,
    flex: 1,
  },
  fieldsCompact: {
    gap: kioskScreenLayout.paymentMobileFieldsGapCompact,
  },
});
