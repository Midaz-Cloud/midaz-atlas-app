import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconCart from '@assets/images/ordering/menu/icon-cart.svg';
import IconChevron from '@assets/images/ordering/menu/icon-cart-chevron.svg';

import { formatPrimaryPrice } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';

export type MenuCartBarProps = {
  itemCount: number;
  totalUsd: number;
  onPressCart: () => void;
  onPressNext: () => void;
  /** P6 cart only; hidden on menu and other ordering screens. */
  showNextButton?: boolean;
};

export function MenuCartBar({
  itemCount,
  totalUsd,
  onPressCart,
  onPressNext,
  showNextButton = false,
}: MenuCartBarProps) {
  const { t } = useTranslation('ordering');
  const pricing = useKioskPricing();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const colors = useKioskScreenColors();
  const disabled = itemCount === 0;
  const totalLabel = formatPrimaryPrice(totalUsd, primaryCurrency);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          position: 'absolute',
          left: kioskScreenLayout.menuHorizontalPadding,
          right: kioskScreenLayout.menuHorizontalPadding,
          bottom: kioskScreenLayout.cartBarBottom,
        },
        bar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.cartBar,
          borderRadius: kioskScreenLayout.cartBarRadius,
          padding: kioskScreenLayout.cartBarPadding,
        },
        cartInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.featuredCardGap * 0.75,
          flex: 1,
        },
        pressed: {
          opacity: 0.9,
        },
        iconWrap: {
          position: 'relative',
          width: kioskScreenLayout.cartIconWidth,
          height: kioskScreenLayout.cartIconHeight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        countBadge: {
          position: 'absolute',
          top: -kioskScreenLayout.badgePaddingVertical * 2.5,
          right: -kioskScreenLayout.badgePaddingHorizontal * 1.5,
          minWidth: kioskScreenLayout.cartCountSize * 1.6,
          height: kioskScreenLayout.cartCountSize * 1.7,
          borderRadius: 9999,
          backgroundColor: colors.cartBadge,
          borderWidth: kioskScreenLayout.categoryTabBorderWidth,
          borderColor: colors.cartBar,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: kioskScreenLayout.badgePaddingVertical,
        },
        countText: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartCountSize,
          lineHeight: kioskScreenLayout.cartCountSize * 1.35,
          color: colors.cardBackground,
          textAlign: 'center',
        },
        cartLabel: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartLabelSize,
          lineHeight: kioskScreenLayout.cartLabelSize * 1.3,
          color: colors.cartBarMutedText,
        },
        cartTotal: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartTotalSize,
          lineHeight: kioskScreenLayout.cartTotalSize * 1.05,
          color: colors.cardBackground,
          marginTop: kioskScreenLayout.badgePaddingVertical * 0.5,
        },
        nextButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.cartNextPaddingVertical,
          backgroundColor: colors.cartNextOverlay,
          borderRadius: kioskScreenLayout.featuredImageRadius,
          paddingHorizontal: kioskScreenLayout.cartNextPaddingHorizontal,
          paddingVertical: kioskScreenLayout.cartNextPaddingVertical,
        },
        nextDisabled: {
          opacity: 0.45,
        },
        nextLabel: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.cartNextSize,
          lineHeight: kioskScreenLayout.cartNextSize * 1.5,
          color: colors.cardBackground,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.bar, kioskScreenShadows.cartBar]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu.cart.viewCart')}
          onPress={onPressCart}
          style={({ pressed }) => [styles.cartInfo, pressed && styles.pressed]}
          testID="menu-cart-summary">
          <View style={styles.iconWrap}>
            <IconCart
              width={kioskScreenLayout.cartIconWidth}
              height={kioskScreenLayout.cartIconHeight}
              color={colors.cartIcon}
            />
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{itemCount}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.cartLabel}>{t('menu.cart.viewCart')}</Text>
            <Text style={styles.cartTotal}>{totalLabel}</Text>
          </View>
        </Pressable>

        {showNextButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('menu.cart.next')}
            disabled={disabled}
            onPress={onPressNext}
            style={({ pressed }) => [
              styles.nextButton,
              disabled && styles.nextDisabled,
              pressed && !disabled && styles.pressed,
            ]}
            testID="menu-cart-next">
            <Text style={styles.nextLabel}>{t('menu.cart.next')}</Text>
            <IconChevron
              width={kioskScreenLayout.cartChevronWidth}
              height={kioskScreenLayout.cartChevronHeight}
              color={colors.cartIcon}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
