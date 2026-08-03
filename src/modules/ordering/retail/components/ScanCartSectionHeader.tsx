import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils/kioskLayout';

import IconCart from '@assets/images/ordering/menu/icon-cart.svg';
import IconRemove from '@assets/images/ordering/cart/icon-line-remove.svg';

import { retailScanLayout } from '../retailScanLayout';

const CLEAR_COLOR = '#ef4444';
const SECTION_DIVIDER_COLOR = '#F3F4F6';

export type ScanCartSectionHeaderProps = {
  itemCount: number;
  onClear: () => void;
  clearDisabled?: boolean;
};

export function ScanCartSectionHeader({
  itemCount,
  onClear,
  clearDisabled = false,
}: ScanCartSectionHeaderProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: retailScanLayout.cartPanelPaddingH,
          paddingTop: retailScanLayout.cartPanelPaddingTop,
          paddingBottom: retailScanLayout.sectionHeaderPaddingBottom,
          borderBottomWidth: retailScanLayout.sectionDividerWidth,
          borderBottomColor: SECTION_DIVIDER_COLOR,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScale(10),
        },
        title: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.sectionTitleSize,
          lineHeight: retailScanLayout.sectionTitleLineHeight,
          color: colors.title,
        },
        badge: {
          minWidth: retailScanLayout.sectionBadgeSize,
          minHeight: retailScanLayout.sectionBadgeSize,
          borderRadius: 9999,
          paddingHorizontal: kioskScale(6),
          paddingVertical: kioskScale(2),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.priceAccent,
        },
        badgeText: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.sectionBadgeFontSize * 0.85,
          lineHeight: retailScanLayout.sectionBadgeFontSize * 0.9,
          color: colors.cartIcon,
          includeFontPadding: false,
          textAlign: 'center',
        },
        clearButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScale(8),
          paddingVertical: kioskScale(6),
          paddingHorizontal: kioskScale(10),
        },
        clearLabel: {
          fontSize: retailScanLayout.sectionClearSize,
          lineHeight: retailScanLayout.sectionClearSize + 6,
          color: CLEAR_COLOR,
          fontWeight: '600',
        },
        clearDisabled: {
          opacity: 0.4,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap} testID="scan-cart-section-header">
      <View style={styles.titleRow}>
        <IconCart
          width={retailScanLayout.sectionCartIconSize}
          height={retailScanLayout.sectionCartIconSize}
          color={colors.priceAccent}
        />
        <Text style={styles.title}>{t('scanCart.cart.title')}</Text>
        {itemCount > 0 ? (
          <View style={styles.badge} testID="scan-cart-item-badge">
            <Text style={styles.badgeText} numberOfLines={1}>
              {itemCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('scanCart.cart.clear')}
        disabled={clearDisabled}
        onPress={onClear}
        style={({ pressed }) => [
          styles.clearButton,
          clearDisabled && styles.clearDisabled,
          pressed && !clearDisabled && { opacity: 0.85 },
        ]}
        testID="scan-cart-clear">
        <IconRemove
          width={retailScanLayout.sectionClearIconSize}
          height={retailScanLayout.sectionClearIconSize}
          color={CLEAR_COLOR}
        />
        <Text style={styles.clearLabel}>{t('scanCart.cart.clear')}</Text>
      </Pressable>
    </View>
  );
}
