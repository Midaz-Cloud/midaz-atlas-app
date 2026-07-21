import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import type { CartLineViewModel } from '../hooks/useCartScreen';
import { CartAddMoreButton } from './CartAddMoreButton';
import { CartLineItem } from './CartLineItem';

export type CartItemsListProps = {
  lines: CartLineViewModel[];
  showAddMore?: boolean;
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
  onAddMore: () => void;
};

export function CartItemsList({
  lines,
  showAddMore = true,
  onIncrement,
  onDecrement,
  onRemove,
  onAddMore,
}: CartItemsListProps) {
  return (
    <View style={styles.list} testID="cart-items-list">
      {lines.map((line) => (
        <CartLineItem
          key={line.lineId}
          line={line}
          onIncrement={() => onIncrement(line.lineId)}
          onDecrement={() => onDecrement(line.lineId)}
          onRemove={() => onRemove(line.lineId)}
        />
      ))}
      {showAddMore ? <CartAddMoreButton onPress={onAddMore} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: kioskScreenLayout.cartHeaderPaddingHorizontal,
    gap: kioskScreenLayout.cartSectionGap,
  },
});
