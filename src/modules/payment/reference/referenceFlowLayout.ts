import { StyleSheet } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

export const referenceFlowLayoutStyles = StyleSheet.create({
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
    gap: kioskScreenLayout.paymentReferenceSectionGap,
  },
  errorActions: {
    alignSelf: 'stretch',
    gap: kioskScreenLayout.paymentReferenceErrorActionsGap,
    marginTop: kioskScreenLayout.paymentReferenceSectionGap,
  },
});
