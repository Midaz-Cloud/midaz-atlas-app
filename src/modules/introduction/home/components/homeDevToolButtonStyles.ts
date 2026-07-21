import { StyleSheet } from 'react-native';

import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export const homeDevToolButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: kioskScale(2),
    borderColor: brand.gold,
    paddingHorizontal: kioskScale(24),
    paddingVertical: kioskScale(16),
    borderRadius: kioskScale(12),
    minWidth: kioskScale(220),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: kioskScale(52),
  },
  label: {
    ...bodyTextStyle(),
    color: brand.navy,
    fontSize: kioskScale(24),
    fontWeight: '600',
  },
});
