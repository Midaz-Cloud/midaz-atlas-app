import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import type { ToppingModifier } from '../types';
import { ToppingCard } from './ToppingCard';

export type ToppingsGridProps = {
  toppings: ToppingModifier[];
  getQuantity: (id: string) => number;
  canSelectMore: boolean;
  maxSelections: number;
  slotsUsed: number;
  onIncrement: (toppingId: string) => void;
  onDecrement: (toppingId: string) => void;
};

export function ToppingsGrid({
  toppings,
  getQuantity,
  canSelectMore,
  maxSelections,
  slotsUsed,
  onIncrement,
  onDecrement,
}: ToppingsGridProps) {
  const rows: ToppingModifier[][] = [];
  for (let index = 0; index < toppings.length; index += 2) {
    rows.push(toppings.slice(index, index + 2));
  }

  const maxForOption = (optionId: string) => {
    const current = getQuantity(optionId);
    const remaining = maxSelections - slotsUsed;
    return current + Math.max(0, remaining);
  };

  return (
    <View style={styles.grid} testID="modifiers-toppings-grid">
      {rows.map((row) => (
        <View key={row.map((item) => item.id).join('-')} style={styles.row}>
          {row.map((topping) => {
            const quantity = getQuantity(topping.id);
            return (
              <View key={topping.id} style={styles.cell}>
                <ToppingCard
                  topping={topping}
                  quantity={quantity}
                  maxQuantity={maxForOption(topping.id)}
                  canIncrement={canSelectMore || quantity > 0}
                  onIncrement={() => onIncrement(topping.id)}
                  onDecrement={() => onDecrement(topping.id)}
                />
              </View>
            );
          })}
          {row.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: kioskScreenLayout.modifiersGridPaddingHorizontal,
    gap: kioskScreenLayout.modifiersGridGap,
  },
  row: {
    flexDirection: 'row',
    gap: kioskScreenLayout.modifiersGridGap,
  },
  cell: {
    flex: 1,
  },
});
