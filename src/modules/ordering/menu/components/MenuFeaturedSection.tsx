import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import type { MenuProduct } from '../types';

import { FeaturedProductCard } from './FeaturedProductCard';

type MenuFeaturedSectionProps = {
  products: MenuProduct[];
  cartQuantityByProductId?: Map<string, number>;
  onProductPress: (product: MenuProduct) => void;
  onAddProduct: (product: MenuProduct) => void;
};

/**
 * P4 · Destacados — título + carrusel horizontal (Figma node 35:18).
 */
export function MenuFeaturedSection({
  products,
  cartQuantityByProductId,
  onProductPress,
  onAddProduct,
}: MenuFeaturedSectionProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  if (products.length === 0) {
    return null;
  }

  return (
    <View style={styles.section} testID="menu-featured-section">
      <Text style={[styles.title, { color: colors.menuSectionHeading }]}>
        {t('menu.featuredTitle')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}>
        {products.map((product, index) => (
          <View
            key={product.id}
            style={[
              styles.cardSlot,
              index < products.length - 1 && styles.cardSlotSpaced,
            ]}>
            <FeaturedProductCard
              product={product}
              cartQuantity={cartQuantityByProductId?.get(product.id) ?? 0}
              onPress={() => onProductPress(product)}
              onAddPress={() => onAddProduct(product)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: kioskScreenLayout.menuSectionGap,
    paddingBottom: kioskScreenLayout.featuredCarouselPaddingVertical,
  },
  title: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    lineHeight: kioskScreenLayout.menuSectionTitleLineHeight,
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
    paddingTop: kioskScreenLayout.featuredCarouselPaddingVertical,
    paddingBottom: kioskScreenLayout.featuredCarouselPaddingVertical,
    alignItems: 'center',
  },
  cardSlot: {
    width: kioskScreenLayout.featuredCarouselCardWidth,
  },
  cardSlotSpaced: {
    marginRight: kioskScreenLayout.featuredCarouselGap,
  },
});
