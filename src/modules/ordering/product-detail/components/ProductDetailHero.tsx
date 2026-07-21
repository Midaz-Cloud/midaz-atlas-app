import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { kioskScreenLayout, kioskScreenShadows, useKioskScreenColors } from '@shared/theme';

import { MenuProductImage } from '../../menu/components/MenuProductImage';

export type ProductDetailHeroProps = {
  image?: ImageSourcePropType;
};

/** Panel crema + foto (Figma 35:164). Sombra solo en el panel crema. */
export function ProductDetailHero({ image }: ProductDetailHeroProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          overflow: 'visible',
        },
        wrap: {
          height: kioskScreenLayout.productDetailHeroHeight,
          backgroundColor: colors.productDetailHeroBg,
          borderBottomLeftRadius: kioskScreenLayout.productDetailHeroRadius,
          borderBottomRightRadius: kioskScreenLayout.productDetailHeroRadius,
          paddingTop: kioskScreenLayout.productDetailHeroPaddingTop,
          paddingBottom: kioskScreenLayout.productDetailHeroPaddingBottom,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        imageFrame: {
          width: kioskScreenLayout.productDetailHeroImageWidth,
          height: kioskScreenLayout.productDetailHeroImageHeight,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          borderRadius: kioskScreenLayout.productDetailHeroImageRadius,
        },
        image: {
          width: '73%',
          height: '100%',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.outer} testID="product-detail-hero">
      <View style={[styles.wrap, kioskScreenShadows.productDetailHeroPanel]}>
        <View style={styles.imageFrame}>
          <MenuProductImage
            source={image}
            style={styles.image}
            containerStyle={styles.image}
            resizeMode="contain"
            testID="product-detail-hero-image"
          />
        </View>
      </View>
    </View>
  );
}
