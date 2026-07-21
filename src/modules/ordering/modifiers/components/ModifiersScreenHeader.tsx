import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@shared/components';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type ModifiersScreenHeaderProps = {
  paddingTop: number;
  onBack: () => void;
};

/** Barra fija superior: solo botón atrás (Figma 72:171). */
export function ModifiersScreenHeader({ paddingTop, onBack }: ModifiersScreenHeaderProps) {
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
      testID="modifiers-screen-header">
      <BackButton onPress={onBack} testID="modifiers-back" />
    </View>
  );
}
