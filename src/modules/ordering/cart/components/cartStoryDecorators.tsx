import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { kioskScreenColors, kioskScreenLayout } from '@shared/theme';

export function cartStoryCanvas(children: ReactNode, minHeight = 200) {
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

/**
 * Canvas para CartCheckoutSheet (Figma 41:92).
 * Scroll + altura mínima evita que el sheet se recorte en viewports bajos de Storybook.
 */
export function cartCheckoutSheetStoryCanvas(children: ReactNode) {
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: kioskScreenColors.screenBackground,
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-end',
        padding: 24,
        paddingTop: 48,
        paddingBottom: 48,
        minHeight: kioskScreenLayout.cartCheckoutScrollBottomInset + 280,
      }}
      showsVerticalScrollIndicator={false}>
      <View style={{ alignSelf: 'stretch' }}>{children}</View>
    </ScrollView>
  );
}
