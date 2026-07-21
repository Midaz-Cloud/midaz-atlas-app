import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPrimaryPrice, formatVesLineAmount } from '@shared/pricing';
import { useBcvExchangeRate, useKioskPricing } from '@shared/session';
import {
  displayTextStyle,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';

import IconRemove from '@assets/images/ordering/cart/icon-line-remove.svg';
import { MenuProductImage } from '../../menu/components/MenuProductImage';
import { CartLineQuantityControls } from '../../cart/components/CartLineQuantityControls';
import type { CartLineViewModel } from '../../cart/hooks/useCartScreen';
import { retailScanLayout } from '../retailScanLayout';

export type ScanCartLineItemProps = {
  line: CartLineViewModel;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

const REMOVE_BG = 'rgba(239, 68, 68, 0.14)';
const REMOVE_ICON = '#ef4444';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function ScanCartLineItem({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: ScanCartLineItemProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const bcvRate = useBcvExchangeRate();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const isUsdPrimary = primaryCurrency.toUpperCase() === 'USD';
  const showMultiQty = line.quantity > 1;

  const primaryAmount = showMultiQty ? line.lineTotalUsd : line.unitPrice;
  const primaryPriceLabel = formatPrimaryPrice(primaryAmount, primaryCurrency);
  const unitPriceLabel = formatPrimaryPrice(line.unitPrice, primaryCurrency);

  const vesAmount = useMemo(() => {
    if (!isUsdPrimary) {
      return null;
    }
    if (showMultiQty) {
      if (line.lineTotalVes != null) {
        return line.lineTotalVes;
      }
      if (bcvRate != null) {
        return roundMoney(line.lineTotalUsd * bcvRate);
      }
      return null;
    }
    if (line.unitPriceVes != null) {
      return line.unitPriceVes;
    }
    if (bcvRate != null) {
      return roundMoney(line.unitPrice * bcvRate);
    }
    return null;
  }, [bcvRate, isUsdPrimary, line, showMultiQty]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.cardBackground,
          borderWidth: retailScanLayout.lineItemBorderWidth,
          borderColor: colors.productDetailBorder,
          borderRadius: retailScanLayout.lineItemRadius,
          padding: retailScanLayout.lineCardPadding,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.lineItemGap,
        },
        imageBox: {
          width: retailScanLayout.lineImageBoxSize,
          height: retailScanLayout.lineImageBoxSize,
          borderRadius: retailScanLayout.lineImageBoxRadius,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        image: {
          width: retailScanLayout.lineImageInnerSize,
          height: retailScanLayout.lineImageInnerSize,
        },
        details: {
          flex: 1,
          justifyContent: 'center',
          gap: retailScanLayout.lineTextGap,
          minWidth: 0,
          paddingLeft: retailScanLayout.lineContentPaddingLeft,
        },
        name: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.lineNameSize,
          lineHeight: retailScanLayout.lineNameLineHeight,
          color: colors.menuSectionHeading,
        },
        modifiers: {
          fontSize: retailScanLayout.lineModifiersSize,
          lineHeight: retailScanLayout.lineModifiersSize + 4,
          color: colors.menuSectionMuted,
        },
        unitPrice: {
          fontSize: retailScanLayout.lineSecondaryPriceSize,
          lineHeight: retailScanLayout.lineSecondaryPriceLineHeight,
          color: colors.menuSectionMuted,
        },
        primaryPrice: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.linePriceSize,
          lineHeight: retailScanLayout.linePriceLineHeight,
          color: colors.priceAccent,
        },
        secondaryPrice: {
          fontSize: retailScanLayout.lineSecondaryPriceSize,
          lineHeight: retailScanLayout.lineSecondaryPriceLineHeight,
          color: colors.menuSectionMuted,
        },
        actions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.lineActionsGap,
          flexShrink: 0,
        },
        removeButton: {
          width: retailScanLayout.lineRemoveButtonSize,
          height: retailScanLayout.lineRemoveButtonSize,
          borderRadius: retailScanLayout.lineRemoveButtonSize / 2,
          backgroundColor: REMOVE_BG,
          alignItems: 'center',
          justifyContent: 'center',
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
        <View style={[styles.imageBox, { backgroundColor: line.imageBackground }]}>
          <MenuProductImage
            source={line.image}
            style={styles.image}
            containerStyle={styles.image}
            resizeMode="contain"
            testID={`cart-line-image-${line.lineId}`}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {line.name}
          </Text>
          {line.modifiersLabel ? (
            <Text style={styles.modifiers} numberOfLines={1}>
              {line.modifiersLabel}
            </Text>
          ) : null}
          {showMultiQty ? (
            <Text style={styles.unitPrice}>
              {t('scanCart.cart.unitPriceEach', { price: unitPriceLabel })}
            </Text>
          ) : null}
          <Text style={styles.primaryPrice}>{primaryPriceLabel}</Text>
          {vesAmount != null ? (
            <Text style={styles.secondaryPrice}>{formatVesLineAmount(vesAmount)}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <CartLineQuantityControls
            quantity={line.quantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            canIncrement={line.canIncrement}
            compact
            testID={`cart-line-quantity-${line.lineId}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove item"
            onPress={onRemove}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            testID={`cart-line-remove-${line.lineId}`}>
            <IconRemove
              width={retailScanLayout.lineRemoveIconSize}
              height={retailScanLayout.lineRemoveIconSize}
              color={REMOVE_ICON}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
