import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@shared/components';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import type { MenuProduct } from '../menu/types';
import {
  ProductDetailBottomBar,
  ProductDetailDescription,
  ProductDetailHeader,
  ProductDetailHero,
  ProductDetailQuantityRow,
} from './components';
import { useProductDetailScreen } from './hooks';

export type ProductDetailScreenProps = {
  product: MenuProduct;
  itemCount: number;
  totalUsd: number;
  /** Units of this product already in the cart (for stock cap). */
  cartQuantityForProduct?: number;
  onBack: () => void;
  onCartPress: () => void;
  onPrimaryAction: (product: MenuProduct, quantity: number) => void;
};

export function ProductDetailScreen({
  product,
  itemCount,
  totalUsd,
  cartQuantityForProduct = 0,
  onBack,
  onCartPress,
  onPrimaryAction,
}: ProductDetailScreenProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        body: {
          flex: 1,
        },
        heroSection: {
          position: 'relative',
          overflow: 'visible',
          zIndex: 1,
          marginBottom: kioskScreenLayout.productDetailHeroShadowMargin,
        },
        header: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          height: kioskScreenLayout.productDetailHeaderHeight,
          justifyContent: 'center',
        },
        scroll: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        scrollContent: {
          flexGrow: 1,
        },
        details: {
          paddingHorizontal: kioskScreenLayout.productDetailContentPadding,
          paddingTop: kioskScreenLayout.productDetailContentPadding,
          gap: kioskScreenLayout.productDetailSectionGap * 2,
        },
        bottomWrap: {
          backgroundColor: colors.screenBackground,
        },
      }),
    [colors],
  );
  const insets = useSafeAreaInsets();
  const {
    name,
    description,
    heroImage,
    quantity,
    maxQuantity,
    canAddToCart,
    primaryLabel,
    lineTotalUsd,
    decrement,
    increment,
  } = useProductDetailScreen(product, cartQuantityForProduct);

  const projectedItemCount = itemCount + quantity;
  const projectedTotalUsd = totalUsd + lineTotalUsd;

  return (
    <View style={styles.root} testID="ordering-product-detail">
      <View style={styles.body}>
        <View style={styles.heroSection}>
          <ProductDetailHero image={heroImage} />
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + kioskScreenLayout.menuHeaderPaddingTop,
                paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
              },
            ]}>
            <BackButton onPress={onBack} testID="product-detail-back" />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: kioskScreenLayout.productDetailContentPadding },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.details}>
            <ProductDetailHeader title={name} unitPrice={product.unitPrice} />
            {description ? <ProductDetailDescription text={description} /> : null}
            <ProductDetailQuantityRow
              quantity={quantity}
              maxQuantity={maxQuantity}
              onDecrement={decrement}
              onIncrement={increment}
            />
          </View>
        </ScrollView>
      </View>

      <View style={[styles.bottomWrap, { paddingBottom: insets.bottom }]}>
        <ProductDetailBottomBar
          itemCount={itemCount}
          totalUsd={totalUsd}
          projectedItemCount={projectedItemCount}
          projectedTotalUsd={projectedTotalUsd}
          primaryLabel={primaryLabel}
          soldOut={product.soldOut || !canAddToCart}
          onPressCart={onCartPress}
          onPressPrimary={() => onPrimaryAction(product, quantity)}
        />
      </View>
    </View>
  );
}
