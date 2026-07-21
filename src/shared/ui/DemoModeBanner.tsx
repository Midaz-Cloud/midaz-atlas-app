import { StyleSheet, Text, View } from 'react-native';

import { isKioskDemoMode, getDemoScenario } from '@shared/config';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

/**
 * Discrete banner when the kiosk runs in explicit demo mode (`.env` / `.env.demo`).
 */
export function DemoModeBanner() {
  if (!isKioskDemoMode) {
    return null;
  }

  const scenario = getDemoScenario();

  return (
    <View style={styles.banner} pointerEvents="none" testID="kiosk-demo-banner">
      <Text style={styles.text}>
        Modo demo
        {scenario !== 'default' ? ` · ${scenario}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: kioskScale(12),
    right: kioskScale(12),
    zIndex: 9999,
    backgroundColor: brand.gold,
    paddingHorizontal: kioskScale(20),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
  },
  text: {
    ...bodyTextStyle,
    color: brand.navy,
    fontSize: kioskScale(22),
    fontWeight: '600',
  },
});
