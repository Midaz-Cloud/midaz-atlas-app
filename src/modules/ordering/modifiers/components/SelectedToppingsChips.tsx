import { ScrollView, StyleSheet } from 'react-native';

import { kioskScreenLayout } from '@shared/theme';

import type { ToppingModifier } from '../types';
import { SelectedToppingChip } from './SelectedToppingChip';

export type SelectedToppingsChipsProps = {
  toppings: (ToppingModifier & { quantity?: number })[];
  onRemove: (toppingId: string) => void;
};

export function SelectedToppingsChips({ toppings, onRemove }: SelectedToppingsChipsProps) {
  if (toppings.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
      testID="modifiers-selected-chips">
      {toppings.map((topping) => (
        <SelectedToppingChip
          key={topping.id}
          topping={topping}
          onRemove={() => onRemove(topping.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    height: kioskScreenLayout.modifiersChipsHeight,
  },
  content: {
    alignItems: 'center',
    gap: kioskScreenLayout.modifiersChipsGap,
    paddingHorizontal: kioskScreenLayout.modifiersBottomPadding * 0.5,
  },
});
