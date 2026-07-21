import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconRemove from '@assets/images/ordering/modifiers/icon-chip-remove.svg';
import type { ToppingModifier } from '../types';

export type SelectedToppingChipProps = {
  topping: ToppingModifier & { quantity?: number };
  onRemove: () => void;
};

function modifierOptionLabel(
  topping: ToppingModifier,
  quantity: number,
  t: (key: string) => string,
): string {
  const base = topping.displayName ?? t(topping.nameKey);
  return quantity > 1 ? `${base} ×${quantity}` : base;
}

export function SelectedToppingChip({ topping, onRemove }: SelectedToppingChipProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const quantity = topping.quantity ?? 1;
  const label = modifierOptionLabel(topping, quantity, t);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.modifiersChipsGap * 0.5,
          backgroundColor: colors.modifierChipBg,
          borderWidth: kioskScreenLayout.modifiersChipBorderWidth,
          borderColor: colors.modifierChipBorder,
          borderRadius: 9999,
          paddingHorizontal: kioskScreenLayout.modifiersChipPaddingHorizontal,
          paddingVertical: kioskScreenLayout.modifiersChipPaddingVertical,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.modifiersChipFontSize,
          lineHeight: kioskScreenLayout.modifiersChipLineHeight,
          color: colors.title,
          flexShrink: 1,
          maxWidth: kioskScreenLayout.modifiersChipLabelMaxWidth,
        },
        removeButton: {
          paddingLeft: kioskScreenLayout.modifiersChipsGap * 0.5,
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.chip} testID={`selected-topping-chip-${topping.id}`}>
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        hitSlop={12}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
        testID={`selected-topping-chip-remove-${topping.id}`}>
        <IconRemove
          width={kioskScreenLayout.modifiersChipRemoveWidth}
          height={kioskScreenLayout.modifiersChipRemoveHeight}
          color={colors.title}
        />
      </Pressable>
    </View>
  );
}
