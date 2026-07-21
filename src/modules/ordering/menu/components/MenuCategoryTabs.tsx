import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

import type { MenuCategory } from '../types';

import { MenuCategoryTab } from './MenuCategoryTab';

type MenuCategoryTabsProps = {
  categories: MenuCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
};

export function MenuCategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: MenuCategoryTabsProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          backgroundColor: colors.cardBackground,
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
          paddingVertical: kioskScreenLayout.searchSectionPaddingVertical,
          gap: kioskScreenLayout.categoriesSectionGap,
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.categoriesTitleSize,
          lineHeight: kioskScreenLayout.categoriesTitleLineHeight,
          color: colors.menuSectionMuted,
        },
        scrollContent: {
          gap: kioskScreenLayout.categoryTabsGap,
          paddingRight: kioskScreenLayout.menuHorizontalPadding,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.section, kioskScreenShadows.menuCard]}>
      <Text style={styles.title}>{t('menu.categoriesTitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {categories.map((category) => (
          <MenuCategoryTab
            key={category.id}
            category={category}
            selected={category.id === selectedCategoryId}
            onPress={() => onSelectCategory(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
