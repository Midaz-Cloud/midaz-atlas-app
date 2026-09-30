import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import type { MenuProduct } from '../types';

import { ProductCard } from './ProductCard';

export type MenuProductRowProps = {
  /** Fila de la grilla: 1 o 2 productos. */
  row: MenuProduct[];
  /** Unidades en carrito del primer / segundo producto (números: memo barato). */
  firstQuantity: number;
  secondQuantity: number;
  onProductPress: (product: MenuProduct) => void;
  onAddProduct: (product: MenuProduct) => void;
};

/**
 * Fila de la grilla del menú (Fase 2 · FlatList). Memoizada por la referencia de
 * la fila + cantidades: agregar un producto al carrito repinta solo la fila de
 * ese producto, no todas las tarjetas de la categoría.
 */
function MenuProductRowComponent({
  row,
  firstQuantity,
  secondQuantity,
  onProductPress,
  onAddProduct,
}: MenuProductRowProps) {
  return (
    <View style={styles.gridRow}>
      {row.map((product, index) => (
        <View key={product.id} style={styles.gridCell}>
          <ProductCard
            product={product}
            cartQuantity={index === 0 ? firstQuantity : secondQuantity}
            onPress={() => onProductPress(product)}
            onAddPress={() => onAddProduct(product)}
          />
        </View>
      ))}
      {row.length === 1 ? <View style={styles.gridCell} /> : null}
    </View>
  );
}

export const MenuProductRow = memo(MenuProductRowComponent);

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: 'row',
    gap: kioskScreenLayout.productGridGap,
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
  },
  gridCell: {
    flex: 1,
  },
});
