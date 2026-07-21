import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bodyTextStyle, displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

type KioskStepHeaderProps = {
  title: string;
  subtitle: string;
};

export function KioskStepHeader({ title, subtitle }: KioskStepHeaderProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: {
          alignItems: 'center',
          marginBottom: kioskScreenLayout.headerBottomSpacing,
          gap: kioskScreenLayout.headerTextGap,
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.titleSize,
          lineHeight: kioskScreenLayout.titleLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.subtitleSize,
          lineHeight: kioskScreenLayout.subtitleLineHeight,
          color: colors.subtitle,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
