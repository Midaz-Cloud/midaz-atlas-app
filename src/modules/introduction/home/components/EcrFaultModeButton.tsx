import { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import {
  ECR_FAULT_MODES,
  getEcrFaultMode,
  setEcrFaultMode,
  type EcrFaultMode,
} from '@shared/peripherals/ecr/ecrFaultInjection';

import { homeDevToolButtonStyles as styles } from './homeDevToolButtonStyles';

const LABELS: Record<EcrFaultMode, string> = {
  off: 'Falla POS: apagada',
  response_once: 'Falla POS: respuesta 1 vez',
  response_always: 'Falla POS: respuesta siempre',
  request_once: 'Falla POS: pedido 1 vez',
};

const EXPECTED: Record<EcrFaultMode, string> = {
  off: 'Los mensajes con el POS viajan sin tocar.',
  response_once:
    'La primera respuesta de cada cobro o cierre llega con un byte cambiado. Atlas pide «resend» y PKUSB entrega su copia íntegra: el cobro termina normal, sin cobrar dos veces. Busca [ECR-FAULT] y «pidiendo reenvío» en logcat.',
  response_always:
    'Todas las respuestas del cobro o cierre llegan dañadas. Atlas pide «resend» cada 1,5 s y a los 45 s usa la última copia dañada con el parser tolerante.',
  request_once:
    'El pedido de cobro o cierre sale dañado. PKUSB no lo ejecuta y contesta -94; Atlas lo reenvía limpio y el cobro sigue normal.',
};

/**
 * Dev control: elige una falla simulada del cable USB (`ecrFaultInjection.ts`) para ver
 * cómo se recupera el cliente con el datáfono real. Solo existe en debug.
 */
export function EcrFaultModeButton() {
  const [mode, setMode] = useState<EcrFaultMode>(getEcrFaultMode);

  const onPress = useCallback(() => {
    const next = ECR_FAULT_MODES[(ECR_FAULT_MODES.indexOf(mode) + 1) % ECR_FAULT_MODES.length]!;
    setEcrFaultMode(next);
    setMode(next);
    Alert.alert(LABELS[next], EXPECTED[next]);
  }, [mode]);

  if (!showKioskDevUi()) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Cambiar la falla simulada del punto de venta"
      testID="introduction-home-ecr-fault-mode">
      <Text style={styles.label}>{LABELS[mode]}</Text>
    </TouchableOpacity>
  );
}
