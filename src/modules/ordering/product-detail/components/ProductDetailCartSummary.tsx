import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPrimaryPriceCompact } from '@shared/pricing';
import { useKioskPricing } from '@shared/session';
import { displayTextStyle, kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import IconCartMini from '@assets/images/ordering/product-detail/icon-cart-mini.svg';

export type ProductDetailCartSummaryProps = {
  itemCount: number;
  totalUsd: number;
  projectedItemCount?: number;
  projectedTotalUsd?: number;
  onPress?: () => void;
};

/** Resumen del carrito actual + total proyectado al agregar (Figma 35:187–35:195). */
export function ProductDetailCartSummary({
  itemCount,
  totalUsd,
  projectedItemCount,
  projectedTotalUsd,
  onPress,
}: ProductDetailCartSummaryProps) {
  const { t } = useTranslation('ordering');
  const pricing = useKioskPricing();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const colors = useKioskScreenColors();
  const totalLabel = formatPrimaryPriceCompact(totalUsd, primaryCurrency);
  const showProjected =
    projectedItemCount != null &&
    projectedTotalUsd != null &&
    (projectedItemCount !== itemCount || projectedTotalUsd !== totalUsd);
  const projectedTotalLabel =
    projectedTotalUsd != null
      ? formatPrimaryPriceCompact(projectedTotalUsd, primaryCurrency)
      : '';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          gap: kioskScreenLayout.productDetailSectionGap * 0.75,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kioskScreenLayout.menuHorizontalPadding * 0.5,
        },
        left: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.productDetailSectionGap,
          flex: 1,
          paddingRight: kioskScreenLayout.productDetailSectionGap,
        },
        label: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCartLabelSize,
          lineHeight: kioskScreenLayout.productDetailCartLabelLineHeight,
          color: colors.menuSectionMuted,
          fontWeight: '500',
          flexShrink: 1,
        },
        total: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCartTotalSize,
          lineHeight: kioskScreenLayout.productDetailCartTotalLineHeight,
          color: colors.menuSectionHeading,
        },
        projectedLabel: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCartLabelSize,
          lineHeight: kioskScreenLayout.productDetailCartLabelLineHeight,
          color: colors.menuSectionMuted,
          fontWeight: '500',
          flexShrink: 1,
        },
        projectedTotal: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.productDetailCartTotalSize,
          lineHeight: kioskScreenLayout.productDetailCartTotalLineHeight,
          color: colors.priceAccent,
        },
        pressed: {
          opacity: 0.9,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} testID="product-detail-cart-summary">
      <Pressable
        accessibilityRole="button"
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.row, onPress && pressed && styles.pressed]}
        testID="product-detail-cart-summary-current">
        <View style={styles.left}>
          <IconCartMini
            width={kioskScreenLayout.productDetailCartIconWidth}
            height={kioskScreenLayout.productDetailCartIconHeight}
            color={colors.menuSectionMuted}
          />
          <Text style={styles.label}>{t('productDetail.cartSummary', { count: itemCount })}</Text>
        </View>
        <Text style={styles.total}>{totalLabel}</Text>
      </Pressable>

      {showProjected ? (
        <View style={styles.row} testID="product-detail-cart-summary-projected">
          <Text style={styles.projectedLabel}>
            {t('productDetail.cartSummaryAfterAdd', { count: projectedItemCount })}
          </Text>
          <Text style={styles.projectedTotal}>{projectedTotalLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
