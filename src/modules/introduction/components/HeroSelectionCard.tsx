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

import { orderTypeLayout, orderTypeShadows } from '../order-type/theme';

export type HeroSelectionImageVariant = 'dineIn' | 'takeOut';

type HeroSelectionCardProps = {
  label: string;
  imageVariant: HeroSelectionImageVariant;
  /** Remote image from kiosk config (`inStoreImage` / `pickupImage`). Omit or null = no image. */
  imageUrl?: string | null;
  onPress: () => void;
  testID?: string;
};

export function HeroSelectionCard({
  label,
  imageVariant,
  imageUrl,
  onPress,
  testID,
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
          height: orderTypeLayout.optionHeight,
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
          top: orderTypeLayout.cardTop,
          width: orderTypeLayout.cardWidth,
          height: orderTypeLayout.cardHeight,
          borderRadius: orderTypeLayout.cardRadius,
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
    [colors],
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
          style={[styles.imageBase, imageStyles[imageVariant]]}
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
