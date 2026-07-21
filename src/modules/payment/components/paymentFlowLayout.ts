import { StyleSheet } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

/** Estilos de contenido compartidos P10 (Figma 47:2, 48:2). */
export const paymentFlowLayoutStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal:
      kioskScreenLayout.paymentPosContentPaddingHorizontal -
      kioskScreenLayout.horizontalPadding,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: kioskScreenLayout.paymentPosSectionGap,
  },
  inner: {
    gap: kioskScreenLayout.paymentPosSectionGap,
    alignSelf: 'stretch',
  },
});
