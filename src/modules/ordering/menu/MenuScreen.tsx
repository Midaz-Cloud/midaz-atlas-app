import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
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
  MenuProductRow,
  MenuSearchHeader,
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

type ProductRow = MenuProduct[];

/**
 * Fase 2 · virtualización. Antes se montaban TODAS las categorías a la vez
 * (`display: none` para las no visibles) "para mantener las imágenes calientes":
 * con catálogos grandes y fotos de varios MB eso decodificaba el catálogo entero
 * en memoria nativa cada vez que un cliente entraba al menú. Ahora solo existe la
 * categoría elegida y, dentro de ella, la FlatList monta las filas cercanas al
 * viewport y recicla el resto. Las imágenes ya viven en disco (`KioskCachedImage`),
 * así que cambiar de categoría vuelve a pintarlas desde archivo, no desde la red.
 */
export function chunkProductsIntoRows(products: MenuProduct[]): ProductRow[] {
  const rows: ProductRow[] = [];
  for (let index = 0; index < products.length; index += 2) {
    rows.push(products.slice(index, index + 2));
  }
  return rows;
}

function rowKey(row: ProductRow): string {
  return row.map((item) => item.id).join('-');
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
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
    gridProducts,
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

  const rows = useMemo(() => chunkProductsIntoRows(gridProducts), [gridProducts]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const sectionTitle =
    selectedCategory?.displayName ??
    (gridProducts[0]?.sectionKey
      ? t(gridProducts[0].sectionKey)
      : selectedCategory
        ? t(selectedCategory.nameKey)
        : '');

  const renderRow = useCallback<ListRenderItem<ProductRow>>(
    ({ item }) => (
      <MenuProductRow
        row={item}
        firstQuantity={cartQuantityByProductId.get(item[0]?.id ?? '') ?? 0}
        secondQuantity={cartQuantityByProductId.get(item[1]?.id ?? '') ?? 0}
        onProductPress={onProductPress}
        onAddProduct={onAddProduct}
      />
    ),
    [cartQuantityByProductId, onAddProduct, onProductPress],
  );

  const header = (
    <View style={styles.header}>
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

      {rows.length > 0 ? (
        <Text style={[styles.sectionTitle, { color: colors.menuSectionHeading }]}>
          {sectionTitle}
        </Text>
      ) : null}
    </View>
  );

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

      <FlatList
        style={styles.scroll}
        data={rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        extraData={cartQuantityByProductId}
        ListHeaderComponent={header}
        ItemSeparatorComponent={RowSeparator}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + kioskScreenLayout.menuScrollBottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        // Filas de 2 tarjetas altas: pocas por pantalla, no vale la pena
        // pre-montar muchas. removeClippedSubviews libera las vistas nativas
        // (y sus bitmaps) de las filas que salen del viewport.
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        testID={`menu-category-panel-${selectedCategoryId}`}
      />

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
    flexGrow: 1,
  },
  header: {
    gap: kioskScreenLayout.menuSectionGap,
    marginBottom: kioskScreenLayout.menuSectionGap,
  },
  sectionTitle: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    lineHeight: kioskScreenLayout.menuSectionTitleLineHeight,
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
  },
  rowSeparator: {
    height: kioskScreenLayout.productGridGap,
  },
});
