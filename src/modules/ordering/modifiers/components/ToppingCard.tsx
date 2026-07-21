import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskCachedImage } from '@shared/components/KioskCachedImage';
import { KioskQuantityStepper } from '@shared/components/KioskQuantityStepper';
import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconCheck from '@assets/images/ordering/modifiers/icon-topping-check.svg';
import { useKioskPricing } from '@shared/session';
import { formatPrimaryPriceCompact } from '@shared/pricing';
import type { ToppingModifier } from '../types';

export type ToppingCardProps = {
  topping: ToppingModifier;
  quantity: number;
  maxQuantity: number;
  canIncrement: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function ToppingCard({
  topping,
  quantity,
  maxQuantity,
  canIncrement,
  onIncrement,
  onDecrement,
}: ToppingCardProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const selected = quantity > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          minHeight: kioskScreenLayout.modifiersCardMinHeight,
          alignItems: 'stretch',
          backgroundColor: colors.cardBackground,
          borderWidth: kioskScreenLayout.modifiersCardBorderWidth,
          borderColor: colors.productDetailBorder,
          borderRadius: kioskScreenLayout.modifiersCardRadius,
          padding: kioskScreenLayout.modifiersCardPadding,
        },
        cardSelected: {
          backgroundColor: colors.modifierSelectedBg,
          borderColor: colors.priceAccent,
        },
        content: {
          flex: 1,
          alignItems: 'center',
          alignSelf: 'stretch',
        },
        tapArea: {
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        pressed: {
          opacity: 0.92,
        },
        imageWrap: {
          alignItems: 'center',
          marginBottom: kioskScreenLayout.modifiersCardImageMarginBottom,
        },
        imageCircle: {
          width: kioskScreenLayout.modifiersCardImageSize,
          height: kioskScreenLayout.modifiersCardImageSize,
          borderRadius: kioskScreenLayout.modifiersCardImageSize / 2,
          backgroundColor: colors.creamInset,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        image: {
          width: '94%',
          height: '94%',
        },
        name: {
          ...displayTextStyle(),
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.modifiersCardNameSize,
          lineHeight: kioskScreenLayout.modifiersCardNameLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        price: {
          ...displayTextStyle(),
          alignSelf: 'stretch',
          fontSize: kioskScreenLayout.modifiersCardPriceSize,
          lineHeight: kioskScreenLayout.modifiersCardPriceLineHeight,
          color: colors.modifierPriceFree,
          textAlign: 'center',
          marginTop: kioskScreenLayout.modifiersHeaderGap * 0.5,
        },
        stepperWrap: {
          marginTop: kioskScreenLayout.modifiersHeaderGap,
          alignSelf: 'stretch',
          alignItems: 'center',
        },
        checkBadge: {
          position: 'absolute',
          top: kioskScreenLayout.modifiersCheckBadgeOffset,
          right: kioskScreenLayout.modifiersCheckBadgeOffset,
          width: kioskScreenLayout.modifiersCheckBadgeSize,
          height: kioskScreenLayout.modifiersCheckBadgeSize,
          borderRadius: kioskScreenLayout.modifiersCheckBadgeSize / 2,
          backgroundColor: colors.priceAccent,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          ...kioskScreenShadows.menuCard,
        },
        checkBadgeHidden: {
          opacity: 0,
        },
      }),
    [colors],
  );

  return (
    <View
      style={[styles.card, selected && styles.cardSelected]}
      testID={`topping-card-${topping.id}`}>
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={canIncrement ? onIncrement : undefined}
          style={({ pressed }) => [styles.tapArea, pressed && styles.pressed]}>
          <View style={styles.imageWrap}>
            <View style={[styles.imageCircle, kioskScreenShadows.modifierCardImage]}>
              {topping.image ? (
                <KioskCachedImage
                  source={topping.image}
                  style={styles.image}
                  containerStyle={styles.image}
                  resizeMode="cover"
                  cacheKind="modifiers"
                  brokenIconSize={kioskScreenLayout.modifiersCardImageSize * 0.35}
                  testID={`topping-image-${topping.id}`}
                />
              ) : null}
            </View>
          </View>

          <Text style={styles.name}>
            {topping.displayName ?? t(topping.nameKey)}
          </Text>
          <Text style={styles.price}>
            {topping.priceUsd > 0 ? `+${formatPrimaryPriceCompact(topping.priceUsd, primaryCurrency)}` : t('modifiers.free')}
          </Text>
        </Pressable>

        <View style={styles.stepperWrap}>
          <KioskQuantityStepper
            value={quantity}
            min={0}
            max={maxQuantity}
            variant="modifierCard"
            onDecrement={onDecrement}
            onIncrement={canIncrement ? onIncrement : () => {}}
            testID={`topping-stepper-${topping.id}`}
          />
        </View>
      </View>

      <View
        style={[styles.checkBadge, !selected && styles.checkBadgeHidden]}
        pointerEvents="none">
        <IconCheck
          width={kioskScreenLayout.modifiersCheckIconSize}
          height={kioskScreenLayout.modifiersCheckIconSize}
          color={colors.cartIcon}
        />
      </View>
    </View>
  );
}
