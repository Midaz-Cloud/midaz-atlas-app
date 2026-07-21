import type { ReactNode } from 'react';
import { View } from 'react-native';

import { kioskScreenColors } from '@shared/theme';

export function modifiersStoryCanvas(children: ReactNode, minHeight = 200) {
  return (
    <View
      style={{
        padding: 24,
        minHeight,
        backgroundColor: kioskScreenColors.screenBackground,
      }}>
      {children}
    </View>
  );
}
