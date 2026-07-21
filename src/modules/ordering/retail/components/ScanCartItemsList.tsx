import { StyleSheet, View } from 'react-native';

import type { CartLineViewModel } from '../../cart/hooks/useCartScreen';
import { retailScanLayout } from '../retailScanLayout';
import { ScanCartLineItem } from './ScanCartLineItem';

export type ScanCartItemsListProps = {
  lines: CartLineViewModel[];
  onIncrement: (lineId: string) => void;
  onDecrement: (lineId: string) => void;
  onRemove: (lineId: string) => void;
};

export function ScanCartItemsList({
  lines,
  onIncrement,
  onDecrement,
  onRemove,
}: ScanCartItemsListProps) {
  return (
    <View style={styles.list} testID="scan-cart-items-list">
      {lines.map((line) => (
        <ScanCartLineItem
          key={line.lineId}
          line={line}
          onIncrement={() => onIncrement(line.lineId)}
          onDecrement={() => onDecrement(line.lineId)}
          onRemove={() => onRemove(line.lineId)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: retailScanLayout.cartPanelPaddingH,
    paddingTop: retailScanLayout.lineListPaddingTop,
    gap: retailScanLayout.lineListGap,
  },
});
