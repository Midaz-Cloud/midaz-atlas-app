import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconMinus from '@assets/images/ordering/product-detail/icon-quantity-minus.svg';
import IconPlus from '@assets/images/ordering/product-detail/icon-quantity-plus.svg';

export type KioskQuantityStepperVariant = 'productDetail' | 'modifierCard';

type StepperTokens = {
  gap: number;
  paddingHorizontal: number;
  paddingVertical: number;
  borderWidth: number;
  buttonSize: number;
  valueSize: number;
  valueLineHeight: number;
  valueMinWidth: number;
  iconWidth: number;
  iconHeight: number;
  plusShadow: boolean;
};

function stepperTokens(variant: KioskQuantityStepperVariant): StepperTokens {
  if (variant === 'modifierCard') {
    return {
      gap: kioskScreenLayout.modifierCardStepperGap,
      paddingHorizontal: kioskScreenLayout.modifierCardStepperPaddingHorizontal,
      paddingVertical: kioskScreenLayout.modifierCardStepperPaddingVertical,
      borderWidth: kioskScreenLayout.modifierCardStepperBorderWidth,
      buttonSize: kioskScreenLayout.modifierCardStepperButtonSize,
      valueSize: kioskScreenLayout.modifierCardStepperValueSize,
      valueLineHeight: kioskScreenLayout.modifierCardStepperValueLineHeight,
      valueMinWidth: kioskScreenLayout.modifierCardStepperValueMinWidth,
      iconWidth: kioskScreenLayout.modifierCardStepperIconWidth,
      iconHeight: kioskScreenLayout.modifierCardStepperIconHeight,
      plusShadow: true,
    };
  }
  return {
    gap: kioskScreenLayout.productDetailStepperGap,
    paddingHorizontal: kioskScreenLayout.productDetailStepperPaddingHorizontal,
    paddingVertical: kioskScreenLayout.productDetailStepperPaddingVertical,
    borderWidth: kioskScreenLayout.productDetailQuantityRowBorderWidth,
    buttonSize: kioskScreenLayout.productDetailStepperButtonSize,
    valueSize: kioskScreenLayout.productDetailStepperValueSize,
    valueLineHeight: kioskScreenLayout.productDetailStepperValueLineHeight,
    valueMinWidth: kioskScreenLayout.productDetailStepperGap * 0.5,
    iconWidth: kioskScreenLayout.productDetailStepperIconWidth,
    iconHeight: kioskScreenLayout.productDetailStepperIconHeight,
    plusShadow: true,
  };
}

export type KioskQuantityStepperProps = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  variant?: KioskQuantityStepperVariant;
  testID?: string;
};

/** Shared +/- quantity control (P5 product detail, P6 modifier cards Figma 172:32). */
export function KioskQuantityStepper({
  value,
  onDecrement,
  onIncrement,
  min = 0,
  max = 99,
  variant = 'productDetail',
  testID = 'kiosk-quantity-stepper',
}: KioskQuantityStepperProps) {
  const colors = useKioskScreenColors();
  const tokens = stepperTokens(variant);
  const canDecrement = value > min;
  const canIncrement = value < max;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stepper: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.gap,
          backgroundColor: colors.cardBackground,
          borderWidth: tokens.borderWidth,
          borderColor: colors.productDetailBorder,
          borderRadius: 9999,
          paddingHorizontal: tokens.paddingHorizontal,
          paddingVertical: tokens.paddingVertical,
          ...kioskScreenShadows.menuCard,
        },
        button: {
          width: tokens.buttonSize,
          height: tokens.buttonSize,
          borderRadius: 9999,
          alignItems: 'center',
          justifyContent: 'center',
        },
        minusButton: {
          backgroundColor: colors.quantityStepperMinusBg,
        },
        plusButton: {
          backgroundColor: colors.priceAccent,
          ...(tokens.plusShadow ? kioskScreenShadows.menuCard : {}),
        },
        buttonDisabled: {
          opacity: 0.4,
        },
        pressed: {
          opacity: 0.88,
        },
        value: {
          ...displayTextStyle(),
          minWidth: tokens.valueMinWidth,
          fontSize: tokens.valueSize,
          lineHeight: tokens.valueLineHeight,
          color: colors.menuSectionHeading,
          textAlign: 'center',
          includeFontPadding: false,
        },
      }),
    [colors, tokens],
  );

  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        disabled={!canDecrement}
        onPress={onDecrement}
        style={({ pressed }) => [
          styles.button,
          styles.minusButton,
          !canDecrement && styles.buttonDisabled,
          pressed && canDecrement && styles.pressed,
        ]}
        testID={`${testID}-decrement`}>
        <IconMinus
          width={tokens.iconWidth}
          height={tokens.iconHeight}
          color={colors.menuSectionMuted}
        />
      </Pressable>

      <Text style={styles.value} testID={`${testID}-value`}>
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        disabled={!canIncrement}
        onPress={onIncrement}
        style={({ pressed }) => [
          styles.button,
          styles.plusButton,
          !canIncrement && styles.buttonDisabled,
          pressed && canIncrement && styles.pressed,
        ]}
        testID={`${testID}-increment`}>
        <IconPlus
          width={tokens.iconWidth}
          height={tokens.iconHeight}
          color={colors.cartIcon}
        />
      </Pressable>
    </View>
  );
}
