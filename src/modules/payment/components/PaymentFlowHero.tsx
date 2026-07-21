import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

export type PaymentFlowHeroProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  minHeight?: number;
};

export function PaymentFlowHero({
  title,
  subtitle,
  icon,
  minHeight = kioskScreenLayout.paymentPosHeroMinHeight,
}: PaymentFlowHeroProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'flex-start',
          gap: kioskScreenLayout.paymentPosHeroGap,
          justifyContent: 'center',
        },
        iconCircle: {
          width: kioskScreenLayout.paymentPosHeroIconOuterSize,
          height: kioskScreenLayout.paymentPosHeroIconOuterSize,
          borderRadius: kioskScreenLayout.paymentPosHeroIconRadius,
          borderWidth: kioskScreenLayout.paymentPosHeroIconBorderWidth,
          borderColor: colors.paymentPosHeroIconBorder,
          backgroundColor: colors.cardBackground,
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.paymentPosTitleSize,
          lineHeight: kioskScreenLayout.paymentPosTitleLineHeight,
          color: colors.title,
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentPosSubtitleSize,
          lineHeight: kioskScreenLayout.paymentPosSubtitleLineHeight,
          color: colors.menuSectionMuted,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.root, { minHeight }]}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
