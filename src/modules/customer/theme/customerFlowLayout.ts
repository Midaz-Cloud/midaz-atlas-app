import { StyleSheet } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

export const customerFlowLayoutStyles = StyleSheet.create({
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
  formFields: {
    alignSelf: 'stretch',
    gap: kioskScreenLayout.customerRegisterFormFieldGap,
  },
  errorText: {
    alignSelf: 'stretch',
  },
  registerActions: {
    alignSelf: 'stretch',
    marginTop: kioskScreenLayout.paymentPosActionsGap,
  },
});
