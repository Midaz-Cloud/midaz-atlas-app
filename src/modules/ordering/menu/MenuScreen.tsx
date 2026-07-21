import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKioskOrder } from '@shared/kiosk-order';
import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import {
  MenuCartBar,
  MenuCategoryTabs,
  MenuFeaturedSection,
  MenuSearchHeader,
  ProductCard,
} from './components';
import { useMenuScreen } from './hooks';
import type { MenuProduct } from './types';

type MenuScreenProps = {
  itemCount: number;
  totalUsd: number;
  onBack: () => void;
  onProductPress: (product: MenuProduct) => void;
  onAddProduct: (product: MenuProduct) => void;
  onCartPress: () => void;
  onCartNext: () => void;
  excludeProductId?: string;
  initialCategoryId?: string;
};

function chunkProductsIntoRows(products: MenuProduct[]): MenuProduct[][] {
  const rows: MenuProduct[][] = [];
  for (let index = 0; index < products.length; index += 2) {
    rows.push(products.slice(index, index + 2));
  }
  return rows;
}

export function MenuScreen({
  itemCount,
  totalUsd,
  onBack,
  onProductPress,
  onAddProduct,
  onCartPress,
  onCartNext,
  excludeProductId,
  initialCategoryId,
}: MenuScreenProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const insets = useSafeAreaInsets();
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    featuredProducts,
    showFeaturedSection,
    productsByCategoryId,
  } = useMenuScreen({ excludeProductId, initialCategoryId });
  const { lines } = useKioskOrder();

  const cartQuantityByProductId = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const line of lines) {
      quantities.set(
        line.productId,
        (quantities.get(line.productId) ?? 0) + line.quantity,
      );
    }
    return quantities;
  }, [lines]);

  return (
    <View
      style={[styles.root, { backgroundColor: colors.screenBackground }]}
      testID="ordering-menu">
      <MenuSearchHeader
        paddingTop={insets.top + kioskScreenLayout.menuHeaderPaddingTop}
        onBack={onBack}
        value={searchQuery}
        onChangeText={setSearchQuery}
        focusAccent="blue"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + kioskScreenLayout.menuScrollBottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}>
        <MenuCategoryTabs
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        {showFeaturedSection ? (
          <MenuFeaturedSection
            products={featuredProducts}
            cartQuantityByProductId={cartQuantityByProductId}
            onProductPress={onProductPress}
            onAddProduct={onAddProduct}
          />
        ) : null}

        {/* Keep every category grid mounted so product images stay warm; only the
            selected category is visible in the layout. */}
        {categories.map((category) => {
          const products = productsByCategoryId.get(category.id) ?? [];
          const isSelected = category.id === selectedCategoryId;
          const productRows = chunkProductsIntoRows(products);
          const sectionTitle =
            category.displayName ??
            (products[0]?.sectionKey ? t(products[0].sectionKey) : t(category.nameKey));

          return (
            <View
              key={category.id}
              collapsable={false}
              pointerEvents={isSelected ? 'auto' : 'none'}
              style={isSelected ? styles.section : styles.sectionHidden}
              testID={`menu-category-panel-${category.id}`}>
              {products.length > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.menuSectionHeading }]}>
                    {sectionTitle}
                  </Text>
                  <View style={styles.grid}>
                    {productRows.map((row) => (
                      <View
                        key={row.map((item) => item.id).join('-')}
                        style={styles.gridRow}>
                        {row.map((product) => (
                          <View key={product.id} style={styles.gridCell}>
                            <ProductCard
                              product={product}
                              cartQuantity={cartQuantityByProductId.get(product.id) ?? 0}
                              onPress={() => onProductPress(product)}
                              onAddPress={() => onAddProduct(product)}
                            />
                          </View>
                        ))}
                        {row.length === 1 ? <View style={styles.gridCell} /> : null}
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <MenuCartBar
        itemCount={itemCount}
        totalUsd={totalUsd}
        onPressCart={onCartPress}
        onPressNext={onCartNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: kioskScreenLayout.menuSectionGap,
  },
  section: {
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
    gap: kioskScreenLayout.menuSectionGap,
  },
  /** Mounted but not laid out — keeps ProductCard / images alive off-screen. */
  sectionHidden: {
    display: 'none',
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
    gap: kioskScreenLayout.menuSectionGap,
  },
  sectionTitle: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    lineHeight: kioskScreenLayout.menuSectionTitleLineHeight,
  },
  grid: {
    gap: kioskScreenLayout.productGridGap,
  },
  gridRow: {
    flexDirection: 'row',
    gap: kioskScreenLayout.productGridGap,
  },
  gridCell: {
    flex: 1,
  },
});
