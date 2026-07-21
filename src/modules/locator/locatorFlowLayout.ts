import { StyleSheet } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

export const locatorFlowLayoutStyles = StyleSheet.create({
  content: {
    paddingHorizontal: kioskScreenLayout.paymentReferenceContentPaddingHorizontal,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: kioskScreenLayout.optionsBottomPadding,
  },
  inner: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: kioskScreenLayout.paymentReferenceMaxWidth,
    gap: kioskScreenLayout.locatorFormActionsGap,
  },
});
