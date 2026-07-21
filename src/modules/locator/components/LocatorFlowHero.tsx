import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import { LocatorHeroIcon } from './LocatorHeroIcon';

export type LocatorFlowHeroProps = {
  title: string;
  subtitle: string;
};

/** Hero P20 · Localizador (Figma 180:187): icono sin caja, contenido centrado. */
export function LocatorFlowHero({ title, subtitle }: LocatorFlowHeroProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'center',
          gap: kioskScreenLayout.locatorHeroGap,
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentPosTitleSize,
          lineHeight: kioskScreenLayout.paymentPosTitleLineHeight,
          color: colors.title,
          textAlign: 'center',
          alignSelf: 'stretch',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentPosSubtitleSize,
          lineHeight: kioskScreenLayout.paymentPosSubtitleLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'center',
          alignSelf: 'stretch',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <LocatorHeroIcon />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
