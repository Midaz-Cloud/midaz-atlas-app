import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

export type ModifiersHeaderProps = {
  title: string;
  subtitle: string;
};

export function ModifiersHeader({ title, subtitle }: ModifiersHeaderProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'flex-start',
          gap: kioskScreenLayout.modifiersHeaderGap,
          paddingHorizontal: kioskScreenLayout.modifiersHeaderPaddingHorizontal,
          paddingVertical: kioskScreenLayout.modifiersHeaderGap,
        },
        title: {
          ...displayTextStyle(),
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.modifiersTitleSize,
          lineHeight: kioskScreenLayout.modifiersTitleLineHeight,
          color: colors.title,
          textAlign: 'left',
        },
        subtitle: {
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.modifiersSubtitleSize,
          lineHeight: kioskScreenLayout.modifiersSubtitleLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'left',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} testID="modifiers-header">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
