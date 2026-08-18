import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native';

import { shouldSendSettlementExcelMail, showKioskDevUi } from '@shared/config';
import { getSettlementMailTestParams, sendSettlementMail } from '@shared/mail';
import { useKioskAppearance } from '@shared/session';
import { brand } from '@shared/theme';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

/**
 * Dev control: generate settlement Excel + send via KIOSK_MAIL_* SMTP.
 * Hidden unless `KIOSK_SETTLEMENT_EXCEL_MAIL=true` (same opt-in as cierre).
 */
export function SettlementMailTestButton() {
  const [busy, setBusy] = useState(false);
  const appearance = useKioskAppearance();

  const onPress = useCallback(async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      const result = await sendSettlementMail({
        ...getSettlementMailTestParams(),
        headerColor: appearance?.primaryColor,
      });
      Alert.alert(
        'Correo cierre',
        `Excel enviado a ${result.to}\nArchivo: ${result.fileName}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Correo cierre', `Error: ${message}`);
      if (__DEV__) {
        console.warn('[SettlementMailTestButton]', error);
      }
    } finally {
      setBusy(false);
    }
  }, [appearance?.primaryColor, busy]);

  if (!showKioskDevUi() || !shouldSendSettlementExcelMail()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Probar correo cierre"
      testID="introduction-home-settlement-mail-test">
      {busy ? (
        <ActivityIndicator color={brand.navy} size="small" />
      ) : (
        <Text style={styles.label}>Probar correo cierre</Text>
      )}
    </TouchableOpacity>
  );
}
