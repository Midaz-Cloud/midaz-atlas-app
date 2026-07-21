import type { ReactNode } from 'react';
import { View } from 'react-native';

import { kioskScreenColors } from '@shared/theme';

export function paymentFlowStoryCanvas(children: ReactNode) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: kioskScreenColors.screenBackground,
      }}>
      {children}
    </View>
  );
}
