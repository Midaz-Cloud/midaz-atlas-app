import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@shared/components';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type CartScreenHeaderProps = {
  paddingTop: number;
  onBack: () => void;
};

export function CartScreenHeader({ paddingTop, onBack }: CartScreenHeaderProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: colors.screenBackground,
          justifyContent: 'center',
          minHeight: kioskScreenLayout.backButtonSize + kioskScreenLayout.menuHeaderPaddingTop,
        },
      }),
    [colors],
  );

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop,
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
        },
      ]}
      testID="cart-screen-header">
      <BackButton onPress={onBack} testID="cart-back" />
    </View>
  );
}
