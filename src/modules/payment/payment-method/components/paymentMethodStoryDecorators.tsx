import type { ReactNode } from 'react';
import { View } from 'react-native';

import { kioskScreenColors } from '@shared/theme';

export function paymentMethodStoryCanvas(children: ReactNode) {
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        backgroundColor: kioskScreenColors.screenBackground,
      }}>
      {children}
    </View>
  );
}
