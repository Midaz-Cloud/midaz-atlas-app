import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconAdd from '@assets/images/ordering/menu/icon-add-featured.svg';

import { formatProductPriceLabel } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';

import type { MenuProduct } from '../types';

import { MenuProductImage } from './MenuProductImage';
import { ProductBadge } from './ProductBadge';

const ADD_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

type FeaturedProductCardProps = {
  product: MenuProduct;
  /** Unidades de este producto ya en el carrito (suma de líneas). */
  cartQuantity?: number;
  onPress: () => void;
  onAddPress: () => void;
};

export function FeaturedProductCard({
  product,
  cartQuantity = 0,
  onPress,
  onAddPress,
}: FeaturedProductCardProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const soldOut = product.soldOut === true;
  const inCart = cartQuantity > 0;
  const showPopularBadge = product.badge === 'popular' && !soldOut;
  const priceLabel = formatProductPriceLabel(
    product.unitPrice,
    pricing?.primaryCurrency ?? 'USD',
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.cardBackground,
          borderRadius: kioskScreenLayout.featuredCardRadius,
          borderWidth: kioskScreenLayout.featuredCardBorderWidth,
          borderColor: colors.creamInset,
          padding: kioskScreenLayout.featuredCardPadding,
          position: 'relative',
        },
        cardFullWidth: {
          width: '100%',
        },
        pressed: {
          opacity: 0.94,
        },
        soldOut: {
          opacity: 0.55,
        },
        mainPressable: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.featuredCardGap,
          paddingRight: kioskScreenLayout.featuredAddSize * 0.35,
        },
        imageWrap: {
          width: kioskScreenLayout.featuredImageSize,
          height: kioskScreenLayout.featuredImageSize,
          borderRadius: kioskScreenLayout.featuredImageRadius,
          backgroundColor: colors.creamInset,
          overflow: 'hidden',
        },
        image: {
          width: '100%',
          height: '100%',
        },
        ribbonBadge: {
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        },
        badge: {
          position: 'absolute',
          top: 0,
          left: 0,
        },
        body: {
          flex: 1,
          gap: kioskScreenLayout.menuSectionGap * 0.6,
          justifyContent: 'center',
        },
        title: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.featuredTitleSize,
          lineHeight: kioskScreenLayout.featuredTitleSize * 1.5,
          color: colors.menuSectionHeading,
        },
        description: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.featuredDescriptionSize,
          lineHeight: kioskScreenLayout.featuredDescriptionSize * 1.3,
          color: colors.menuSectionMuted,
        },
        price: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.featuredPriceSize,
          lineHeight: kioskScreenLayout.featuredPriceSize * 1.6,
          color: colors.priceAccent,
          marginTop: kioskScreenLayout.menuSectionGap * 0.4,
        },
        addButtonWrap: {
          position: 'absolute',
          right: kioskScreenLayout.featuredCardPadding,
          bottom: kioskScreenLayout.featuredCardPadding,
          zIndex: 2,
          elevation: 3,
        },
        addButton: {
          width: kioskScreenLayout.featuredAddSize,
          height: kioskScreenLayout.featuredAddSize,
          borderRadius: kioskScreenLayout.featuredAddSize / 2,
          backgroundColor: colors.addButtonMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        addButtonInCart: {
          backgroundColor: colors.priceAccent,
        },
        addButtonDisabled: {
          opacity: 0.45,
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
          zIndex: 3,
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

  return (
    <View
      style={[
        styles.card,
        styles.cardFullWidth,
        kioskScreenShadows.menuCard,
        soldOut && styles.soldOut,
      ]}
      testID={`menu-product-${product.id}`}>
      {soldOut ? (
        <View style={styles.ribbonBadge} pointerEvents="none">
          <ProductBadge badge="soldOut" variant="ribbon" />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: soldOut }}
        disabled={soldOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.mainPressable,
          pressed && !soldOut && styles.pressed,
        ]}
        testID={`menu-product-${product.id}-open`}>
        <View style={styles.imageWrap}>
          <MenuProductImage
            source={product.image}
            style={styles.image}
            containerStyle={styles.image}
            resizeMode="cover"
            testID={`menu-featured-image-${product.id}`}
          />
          {showPopularBadge ? (
            <View style={styles.badge} pointerEvents="none">
              <ProductBadge badge="popular" />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>
            {product.displayName ?? t(product.nameKey)}
          </Text>
          {product.displayDescription ? (
            <Text style={styles.description} numberOfLines={3}>
              {product.displayDescription}
            </Text>
          ) : product.descriptionKey ? (
            <Text style={styles.description} numberOfLines={3}>
              {t(product.descriptionKey)}
            </Text>
          ) : null}
          <Text style={styles.price}>{priceLabel}</Text>
        </View>
      </Pressable>

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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: soldOut, selected: inCart }}
          accessibilityLabel={t('menu.addProduct')}
          disabled={soldOut}
          onPress={onAddPress}
          activeOpacity={0.85}
          hitSlop={ADD_HIT_SLOP}
          style={[
            styles.addButton,
            inCart && styles.addButtonInCart,
            soldOut && styles.addButtonDisabled,
          ]}
          testID={`menu-add-${product.id}`}>
          <IconAdd
            width={kioskScreenLayout.featuredAddIconWidth}
            height={kioskScreenLayout.featuredAddIconHeight}
            color={inCart ? colors.cartIcon : colors.priceAccent}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
