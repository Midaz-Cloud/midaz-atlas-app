import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  displayTextStyle,
  kioskScreenLayout,
  kioskScreenShadows,
  useKioskScreenColors,
} from '@shared/theme';
import { retailScanLayout } from '@modules/ordering/retail/retailScanLayout';

import IconCtaChevron from '@assets/images/ordering/product-detail/icon-cta-chevron.svg';

export type ProductDetailPrimaryCtaProps = {
  label: string;
  disabled?: boolean;
  compact?: boolean;
  /** Shrink to content width and center (retail scan pay). */
  inline?: boolean;
  onPress: () => void;
  testID?: string;
};

/** CTA principal: Agregar o Continuar hacia modificadores (Figma 35:196–35:200). */
export function ProductDetailPrimaryCta({
  label,
  disabled = false,
  compact = false,
  inline = false,
  onPress,
  testID = 'product-detail-primary-cta',
}: ProductDetailPrimaryCtaProps) {
  const colors = useKioskScreenColors();
  const iconWidth = compact
    ? retailScanLayout.ctaIconWidth
    : kioskScreenLayout.productDetailCtaIconWidth;
  const iconHeight = compact
    ? retailScanLayout.ctaIconHeight
    : kioskScreenLayout.productDetailCtaIconHeight;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cta: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? retailScanLayout.ctaGap : kioskScreenLayout.productDetailSectionGap,
          backgroundColor: colors.priceAccent,
          borderRadius: compact
            ? retailScanLayout.ctaRadius
            : kioskScreenLayout.productDetailCtaRadius,
          paddingVertical: compact
            ? retailScanLayout.ctaPaddingVertical
            : kioskScreenLayout.productDetailCtaPaddingVertical,
          ...(compact && inline
            ? {
                alignSelf: 'center',
                paddingHorizontal: retailScanLayout.ctaPaddingHorizontal,
              }
            : null),
          ...(compact ? null : kioskScreenShadows.menuCard),
        },
        ctaDisabled: {
          opacity: 0.45,
        },
        pressed: {
          opacity: 0.9,
        },
        label: {
          ...displayTextStyle(),
          fontSize: compact
            ? retailScanLayout.ctaFontSize
            : kioskScreenLayout.productDetailCtaFontSize,
          lineHeight: compact
            ? retailScanLayout.ctaLineHeight
            : kioskScreenLayout.productDetailCtaLineHeight,
          color: colors.cartIcon,
        },
      }),
    [colors, compact, inline],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        disabled && styles.ctaDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <IconCtaChevron width={iconWidth} height={iconHeight} color={colors.cartIcon} />
    </Pressable>
  );
}
