import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrimaryPrice } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';
import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconRemove from '@assets/images/ordering/cart/icon-line-remove.svg';
import { MenuProductImage } from '../../menu/components/MenuProductImage';
import type { CartLineViewModel } from '../hooks/useCartScreen';
import { CartLineQuantityControls } from './CartLineQuantityControls';

export type CartLineItemProps = {
  line: CartLineViewModel;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartLineItem({ line, onIncrement, onDecrement, onRemove }: CartLineItemProps) {
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const unitPriceLabel = formatPrimaryPrice(
    line.unitPrice,
    pricing?.primaryCurrency ?? 'USD',
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.cartItemBorderWidth,
          borderColor: colors.productDetailBorder,
          borderRadius: kioskScreenLayout.cartItemRadius,
          overflow: 'hidden',
          paddingRight: kioskScreenLayout.cartItemPaddingRight,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: kioskScreenLayout.cartItemGap,
        },
        imageSlot: {
          width: kioskScreenLayout.cartItemImageSlotWidth,
          minHeight: imagePanelMinHeight,
          padding: kioskScreenLayout.cartItemImageSlotPadding,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
        image: {
          width: imageInnerWidth,
          height: kioskScreenLayout.cartItemImageHeight,
        },
        details: {
          flex: 1,
          justifyContent: 'center',
          gap: kioskScreenLayout.cartItemContentGap,
          paddingVertical: kioskScreenLayout.cartItemPaddingVertical,
          paddingLeft: kioskScreenLayout.cartItemContentPaddingLeft,
          minWidth: 0,
        },
        textBlock: {
          gap: kioskScreenLayout.cartItemTextGap,
        },
        name: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartItemNameSize,
          lineHeight: kioskScreenLayout.cartItemNameLineHeight,
          color: colors.menuSectionHeading,
        },
        modifiers: {
          fontSize: kioskScreenLayout.cartItemModifiersSize,
          lineHeight: kioskScreenLayout.cartItemModifiersLineHeight,
          color: colors.menuSectionMuted,
        },
        price: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartItemPriceSize,
          lineHeight: kioskScreenLayout.cartItemPriceLineHeight,
          color: colors.priceAccent,
        },
        removeButton: {
          width: kioskScreenLayout.cartLineRemoveButtonSize,
          height: kioskScreenLayout.cartLineRemoveButtonSize,
          borderRadius: kioskScreenLayout.cartLineRemoveButtonSize / 2,
          borderWidth: kioskScreenLayout.cartLineRemoveBorderWidth,
          borderColor: colors.productDetailBorder,
          backgroundColor: colors.cardBackground,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          alignSelf: 'center',
          marginRight: kioskScreenLayout.cartItemBorderWidth,
        },
        pressed: {
          opacity: 0.88,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.card, kioskScreenShadows.menuCard]} testID={`cart-line-${line.lineId}`}>
      <View style={styles.row}>
        <View style={[styles.imageSlot, { backgroundColor: line.imageBackground }]}>
          <MenuProductImage
            source={line.image}
            style={styles.image}
            containerStyle={styles.image}
            resizeMode="contain"
            testID={`cart-line-image-${line.lineId}`}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.textBlock}>
            <Text style={styles.name} numberOfLines={2}>
              {line.name}
            </Text>
            {line.modifiersLabel ? (
              <Text style={styles.modifiers} numberOfLines={2}>
                {line.modifiersLabel}
              </Text>
            ) : null}
            <Text style={styles.price}>{unitPriceLabel}</Text>
          </View>
          <CartLineQuantityControls
            quantity={line.quantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            canIncrement={line.canIncrement}
            testID={`cart-line-quantity-${line.lineId}`}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove item"
          onPress={onRemove}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
          testID={`cart-line-remove-${line.lineId}`}>
          <IconRemove
            width={kioskScreenLayout.cartLineQtyIconWidth}
            height={kioskScreenLayout.cartLineQtyIconHeight}
            color={colors.cartLineRemoveIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const imageInnerWidth =
  kioskScreenLayout.cartItemImageSlotWidth -
  kioskScreenLayout.cartItemImageSlotPadding * 2;

const imagePanelMinHeight =
  kioskScreenLayout.cartItemImageHeight +
  kioskScreenLayout.cartItemImageSlotPadding * 2;

