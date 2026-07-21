import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import type { MenuCategory } from '../types';

import { MenuProductImage } from './MenuProductImage';

type MenuCategoryTabProps = {
  category: MenuCategory;
  selected: boolean;
  onPress: () => void;
};

export function MenuCategoryTab({
  category,
  selected,
  onPress,
}: MenuCategoryTabProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        tab: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: kioskScreenLayout.categoryTabGap,
          height: kioskScreenLayout.categoryTabHeight,
          minWidth: kioskScreenLayout.categoryTabMinWidth,
          paddingHorizontal: kioskScreenLayout.categoryTabGap + 4,
          borderRadius: kioskScreenLayout.categoryTabRadius,
          borderWidth: kioskScreenLayout.categoryTabBorderWidth,
        },
        tabSelected: {
          backgroundColor: colors.categorySelectedBg,
          borderColor: colors.categorySelectedBorder,
        },
        tabDefault: {
          backgroundColor: colors.cardBackground,
          borderColor: colors.title,
        },
        pressed: {
          opacity: 0.9,
        },
        imageSlot: {
          width: kioskScreenLayout.categoryTabImageWidth,
          height: kioskScreenLayout.categoryTabImageHeight,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: kioskScreenLayout.categoryTabImageWidth / 4,
        },
        image: {
          width: '100%',
          height: '100%',
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.categoryTabLabelSize,
          lineHeight: kioskScreenLayout.categoryTabLabelSize * 1.12,
          color: colors.title,
          flexShrink: 1,
        },
      }),
    [colors],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected ? styles.tabSelected : styles.tabDefault,
        pressed && styles.pressed,
      ]}
      testID={`menu-category-${category.id}`}>
      <View style={styles.imageSlot}>
        <MenuProductImage
          source={category.image}
          style={styles.image}
          containerStyle={styles.image}
          resizeMode="contain"
          brokenIconSize={28}
          testID={`menu-category-image-${category.id}`}
        />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {category.displayName ?? t(category.nameKey)}
      </Text>
    </Pressable>
  );
}
