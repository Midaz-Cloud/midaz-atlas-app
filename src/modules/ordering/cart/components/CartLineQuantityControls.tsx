import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconMinus from '@assets/images/ordering/cart/icon-line-minus.svg';
import IconPlus from '@assets/images/ordering/cart/icon-line-plus.svg';
import { retailScanLayout } from '@modules/ordering/retail/retailScanLayout';

export type CartLineQuantityControlsProps = {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  canIncrement?: boolean;
  compact?: boolean;
  testID?: string;
};

export function CartLineQuantityControls({
  quantity,
  onDecrement,
  onIncrement,
  canIncrement = true,
  compact = false,
  testID = 'cart-line-quantity',
}: CartLineQuantityControlsProps) {
  const colors = useKioskScreenColors();
  const canDecrement = quantity > 1;
  const iconSize = compact
    ? retailScanLayout.lineQtyIconSize
    : kioskScreenLayout.cartLineQtyIconWidth;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: compact
            ? retailScanLayout.lineStepperGap
            : kioskScreenLayout.cartLineStepperGap,
          backgroundColor: colors.creamInset,
          borderRadius: 9999,
          paddingHorizontal: compact
            ? retailScanLayout.lineStepperPaddingH
            : kioskScreenLayout.cartLineStepperPaddingHorizontal,
          paddingVertical: compact
            ? retailScanLayout.lineStepperPaddingV
            : kioskScreenLayout.cartLineStepperPaddingVertical,
          overflow: 'hidden',
        },
        button: {
          width: compact
            ? retailScanLayout.lineQtyButtonSize
            : kioskScreenLayout.cartLineQtyButtonSize,
          height: compact
            ? retailScanLayout.lineQtyButtonSize
            : kioskScreenLayout.cartLineQtyButtonSize,
          borderRadius:
            (compact
              ? retailScanLayout.lineQtyButtonSize
              : kioskScreenLayout.cartLineQtyButtonSize) / 2,
          backgroundColor: colors.cardBackground,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          ...kioskScreenShadows.menuCard,
        },
        incrementButton: {
          backgroundColor: colors.priceAccent,
          ...kioskScreenShadows.menuCard,
        },
        buttonDisabled: {
          opacity: 0.4,
        },
        pressed: {
          opacity: 0.88,
        },
        value: {
          ...displayTextStyle(),
          minWidth: compact
            ? retailScanLayout.lineQtyValueSize * 0.9
            : kioskScreenLayout.cartLineQtyValueSize * 0.9,
          fontSize: compact
            ? retailScanLayout.lineQtyValueSize
            : kioskScreenLayout.cartLineQtyValueSize,
          lineHeight: compact
            ? retailScanLayout.lineQtyValueLineHeight
            : kioskScreenLayout.cartLineQtyValueLineHeight,
          color: colors.title,
          textAlign: 'center',
          includeFontPadding: false,
        },
      }),
    [colors, compact],
  );

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={!canDecrement}
        onPress={onDecrement}
        style={({ pressed }) => [
          styles.button,
          !canDecrement && styles.buttonDisabled,
          pressed && canDecrement && styles.pressed,
        ]}
        testID={`${testID}-decrement`}>
        <IconMinus width={iconSize} height={iconSize} color={colors.title} />
      </Pressable>

      <Text style={styles.value} testID={`${testID}-value`}>
        {quantity}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        disabled={!canIncrement}
        onPress={onIncrement}
        style={({ pressed }) => [
          styles.button,
          compact && styles.incrementButton,
          !canIncrement && styles.buttonDisabled,
          pressed && canIncrement && styles.pressed,
        ]}
        testID={`${testID}-increment`}>
        <IconPlus
          width={iconSize}
          height={iconSize}
          color={compact ? colors.cartIcon : colors.title}
        />
      </Pressable>
    </View>
  );
}
