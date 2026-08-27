import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import { KioskCachedImage } from '@shared/components/KioskCachedImage';

import {
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import { orderTypeCompactLayout, orderTypeLayout, orderTypeShadows } from '../order-type/theme';

export type HeroSelectionImageVariant = 'dineIn' | 'takeOut';

type HeroSelectionCardProps = {
  label: string;
  imageVariant: HeroSelectionImageVariant;
  /** Remote image from kiosk config (`inStoreImage` / `pickupImage`). Omit or null = no image. */
  imageUrl?: string | null;
  onPress: () => void;
  testID?: string;
  /** Variante achatada para cuando entran 3 opciones en pantalla. */
  compact?: boolean;
};

export function HeroSelectionCard({
  label,
  imageVariant,
  imageUrl,
  onPress,
  testID,
  compact = false,
}: HeroSelectionCardProps) {
  const colors = useKioskScreenColors();
  const [loadFailed, setLoadFailed] = useState(false);

  const hasUrl = Boolean(imageUrl?.trim());
  const showImage = hasUrl && !loadFailed;

  useEffect(() => {
    setLoadFailed(false);
  }, [imageUrl]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: orderTypeLayout.optionWidth,
          height: compact
            ? orderTypeCompactLayout.optionHeight
            : orderTypeLayout.optionHeight,
          alignSelf: 'center',
        },
        pressed: {
          opacity: 0.94,
        },
        imageBase: {
          position: 'absolute',
          zIndex: 1,
        },
        card: {
          position: 'absolute',
          left: orderTypeLayout.cardHorizontalInset,
          top: compact ? orderTypeCompactLayout.cardTop : orderTypeLayout.cardTop,
          width: orderTypeLayout.cardWidth,
          height: compact
            ? orderTypeCompactLayout.cardHeight
            : orderTypeLayout.cardHeight,
          borderRadius: compact
            ? orderTypeCompactLayout.cardRadius
            : orderTypeLayout.cardRadius,
          backgroundColor: colors.cardBackground,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: kioskScreenLayout.cardPaddingHorizontal,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cardLabelSize,
          lineHeight: kioskScreenLayout.cardLabelLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
      }),
    [colors, compact],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      testID={testID}>
      {showImage ? (
        <KioskCachedImage
          source={{ uri: imageUrl! }}
          style={[
            styles.imageBase,
            compact ? compactImageStyles[imageVariant] : imageStyles[imageVariant],
          ]}
          resizeMode="contain"
          onError={() => setLoadFailed(true)}
        />
      ) : null}
      <View style={[styles.card, orderTypeShadows.heroCard]}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const scaleImage = (value: number) => value * orderTypeCompactLayout.imageScale;

const imageStyles: Record<HeroSelectionImageVariant, StyleProp<ImageStyle>> = {
  dineIn: {
    width: orderTypeLayout.imageWidthDineIn,
    height: orderTypeLayout.imageHeightDineIn,
    top: orderTypeLayout.imageTopDineIn,
    alignSelf: 'center',
  },
  takeOut: {
    width: orderTypeLayout.imageWidthTakeOut,
    height: orderTypeLayout.imageHeightTakeOut,
    top: orderTypeLayout.imageTopTakeOut,
    left: orderTypeLayout.imageLeftTakeOut,
  },
};

const compactImageStyles: Record<HeroSelectionImageVariant, StyleProp<ImageStyle>> = {
  dineIn: {
    width: scaleImage(orderTypeLayout.imageWidthDineIn),
    height: scaleImage(orderTypeLayout.imageHeightDineIn),
    top: scaleImage(orderTypeLayout.imageTopDineIn),
    alignSelf: 'center',
  },
  takeOut: {
    width: scaleImage(orderTypeLayout.imageWidthTakeOut),
    height: scaleImage(orderTypeLayout.imageHeightTakeOut),
    top: scaleImage(orderTypeLayout.imageTopTakeOut),
    left: scaleImage(orderTypeLayout.imageLeftTakeOut),
  },
};
