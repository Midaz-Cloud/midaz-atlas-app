import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bodyTextStyle, colors, displayTextStyle, typography } from '@shared/theme';
import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

export type SelectionOptionCardVariant = 'featured' | 'compact';

type SelectionOptionCardProps = {
  label: string;
  description?: string;
  hint?: string;
  leading?: ReactNode;
  leadingBackgroundColor?: string;
  variant?: SelectionOptionCardVariant;
  onPress: () => void;
  testID?: string;
};

export function SelectionOptionCard({
  label,
  description,
  hint,
  leading,
  leadingBackgroundColor,
  variant = leading ? 'featured' : 'compact',
  onPress,
  testID,
}: SelectionOptionCardProps) {
  const themeColors = useKioskScreenColors();
  const isFeatured = variant === 'featured';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardFeatured: {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.cardInnerGap,
          backgroundColor: themeColors.cardBackground,
          borderRadius: kioskScreenLayout.cardRadius,
          borderWidth: kioskScreenLayout.cardBorderWidth,
          borderColor: themeColors.productDetailBorder,
          paddingVertical: kioskScreenLayout.cardPaddingVertical,
          paddingHorizontal: kioskScreenLayout.cardPaddingHorizontal,
          overflow: 'hidden',
        },
        cardCompact: {
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.surface,
          borderRadius: 12,
          paddingVertical: 28,
          paddingHorizontal: 24,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: colors.sky,
        },
        pressed: {
          opacity: 0.92,
        },
        iconCircle: {
          width: kioskScreenLayout.cardIconSize,
          height: kioskScreenLayout.cardIconSize,
          borderRadius: kioskScreenLayout.cardIconSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        textColumn: {
          flex: 1,
          justifyContent: 'center',
        },
        labelFeatured: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cardLabelSize,
          lineHeight: kioskScreenLayout.cardLabelLineHeight,
          color: themeColors.title,
        },
        description: {
          ...bodyTextStyle(),
          marginTop: kioskScreenLayout.cardDescriptionMarginTop,
          fontSize: kioskScreenLayout.cardDescriptionSize,
          lineHeight: kioskScreenLayout.cardDescriptionLineHeight,
          color: themeColors.subtitle,
        },
        labelCompact: {
          ...displayTextStyle(),
          fontSize: typography.title,
          color: colors.textOnLight,
        },
        hint: {
          marginTop: 4,
          fontSize: typography.caption,
          color: colors.textMutedOnLight,
        },
      }),
    [themeColors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        isFeatured ? styles.cardFeatured : styles.cardCompact,
        isFeatured ? kioskScreenShadows.card : null,
        pressed && styles.pressed,
      ]}
      testID={testID}>
      {isFeatured ? (
        <>
          <View
            style={[
              styles.iconCircle,
              leadingBackgroundColor ? { backgroundColor: leadingBackgroundColor } : null,
            ]}>
            {leading}
          </View>
          <View style={styles.textColumn}>
            <Text style={styles.labelFeatured}>{label}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.labelCompact}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </>
      )}
    </Pressable>
  );
}
