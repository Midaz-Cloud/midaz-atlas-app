import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconAdd from '@assets/images/ordering/menu/icon-add-grid.svg';

import { formatProductPriceLabel } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';

import type { MenuProduct } from '../types';

import { MenuProductImage } from './MenuProductImage';
import { ProductBadge } from './ProductBadge';

type ProductCardProps = {
  product: MenuProduct;
  /** Unidades de este producto ya en el carrito (suma de líneas). */
  cartQuantity?: number;
  onPress: () => void;
  onAddPress: () => void;
};

export function ProductCard({
  product,
  cartQuantity = 0,
  onPress,
  onAddPress,
}: ProductCardProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const inCart = cartQuantity > 0;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: '100%',
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScreenLayout.productCardRadius,
          borderWidth: kioskScreenLayout.productCardBorderWidth,
          borderColor: colors.creamInset,
          padding: kioskScreenLayout.productCardPadding,
          overflow: 'hidden',
        },
        cardWithRibbon: {
          overflow: 'visible',
        },
        cardWithQtyBadge: {
          overflow: 'visible',
        },
        highlighted: {
          borderColor: colors.highlightRing,
          borderWidth: kioskScreenLayout.categoryTabBorderWidth,
        },
        soldOut: {
          opacity: 0.55,
        },
        pressed: {
          opacity: 0.94,
        },
        ribbonBadge: {
          position: 'absolute',
          top: -kioskScreenLayout.badgeRibbonTopOffset,
          left: 0,
          zIndex: 2,
        },
        imageSection: {
          width: '100%',
          marginBottom: kioskScreenLayout.productImagePadding,
        },
        imageWrap: {
          width: '100%',
          height: kioskScreenLayout.productImageHeight,
          borderRadius: kioskScreenLayout.productImageRadius,
          backgroundColor: colors.creamInset,
          padding: kioskScreenLayout.productImagePadding,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          ...kioskScreenShadows.productImage,
        },
        image: {
          width: '100%',
          height: '100%',
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productTitleSize,
          lineHeight: kioskScreenLayout.productTitleSize * 1.25,
          color: colors.menuSectionHeading,
          marginBottom: kioskScreenLayout.productImagePadding,
        },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: kioskScreenLayout.productCardBorderWidth,
          borderTopColor: colors.creamInset,
          paddingTop: kioskScreenLayout.productImagePadding,
        },
        price: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productPriceSize,
          lineHeight: kioskScreenLayout.productPriceSize * 1.5,
          color: colors.priceAccent,
        },
        addButtonWrap: {
          position: 'relative',
        },
        addButton: {
          width: kioskScreenLayout.productAddSize,
          height: kioskScreenLayout.productAddSize,
          borderRadius: kioskScreenLayout.productAddSize / 2,
          backgroundColor: colors.addButtonMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        addButtonInCart: {
          backgroundColor: colors.priceAccent,
        },
        addPressed: {
          opacity: 0.88,
        },
        qtyBadge: {
          position: 'absolute',
          top: kioskScreenLayout.productAddQtyBadgeOffset,
          right: kioskScreenLayout.productAddQtyBadgeOffset,
          minWidth: kioskScreenLayout.productAddQtyBadgeMinSize,
          height: kioskScreenLayout.productAddQtyBadgeMinSize,
          borderRadius: kioskScreenLayout.productAddQtyBadgeMinSize / 2,
          paddingHorizontal: kioskScreenLayout.productAddQtyBadgeMinSize * 0.2,
          backgroundColor: colors.menuSectionHeading,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        },
        qtyBadgeText: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScreenLayout.productAddQtyBadgeFontSize,
          lineHeight: kioskScreenLayout.productAddQtyBadgeFontSize * 1.2,
          color: colors.cartIcon,
          textAlign: 'center',
        },
      }),
    [colors],
  );
  const pricing = useKioskPricing();
  const priceLabel = formatProductPriceLabel(
    product.unitPrice,
    pricing?.primaryCurrency ?? 'USD',
  );

  const soldOut = product.soldOut;

  const showPopularRibbon = product.badge === 'popular' && !soldOut;
  const showSoldOutBadge = soldOut;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={soldOut}
      style={({ pressed }) => [
        styles.card,
        kioskScreenShadows.menuCard,
        product.highlighted && styles.highlighted,
        showPopularRibbon && styles.cardWithRibbon,
        inCart && styles.cardWithQtyBadge,
        soldOut && styles.soldOut,
        pressed && !soldOut && styles.pressed,
      ]}
      testID={`menu-product-${product.id}`}>
      {showPopularRibbon ? (
        <View style={styles.ribbonBadge} pointerEvents="none">
          <ProductBadge badge="popular" variant="ribbon" />
        </View>
      ) : null}
      {showSoldOutBadge ? (
        <View style={styles.ribbonBadge} pointerEvents="none">
          <ProductBadge badge="soldOut" variant="ribbon" />
        </View>
      ) : null}

      <View style={styles.imageSection}>
        <View style={styles.imageWrap}>
          <MenuProductImage
            source={product.image}
            style={styles.image}
            containerStyle={styles.image}
            resizeMode="contain"
            testID={`menu-product-image-${product.id}`}
          />
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {product.displayName ?? t(product.nameKey)}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.price}>{priceLabel}</Text>
        <View style={styles.addButtonWrap}>
          {inCart ? (
            <View
              style={styles.qtyBadge}
              pointerEvents="none"
              testID={`menu-add-qty-${product.id}`}>
              <Text style={styles.qtyBadgeText}>
                {cartQuantity > 99 ? '99+' : String(cartQuantity)}
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: inCart }}
            accessibilityLabel={t('menu.addProduct')}
            disabled={soldOut}
            onPress={onAddPress}
            style={({ pressed }) => [
              styles.addButton,
              inCart && styles.addButtonInCart,
              pressed && styles.addPressed,
            ]}
            testID={`menu-add-${product.id}`}>
            <IconAdd
              width={kioskScreenLayout.productAddIconWidth}
              height={kioskScreenLayout.productAddIconHeight}
              color={inCart ? colors.cartIcon : colors.priceAccent}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
