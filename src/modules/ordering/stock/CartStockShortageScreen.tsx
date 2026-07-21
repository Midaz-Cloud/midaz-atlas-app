import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import type { CartReserveItemResult } from '@shared/api/kiosk';
import { findCatalogProductByApiId } from '@shared/catalog/catalogStore';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconShoppingCartOff from '@assets/images/ordering/stock/icon-shopping-cart-off.svg';

import { PaymentPrimaryCta } from '@modules/payment/components/PaymentPrimaryCta';

const ICON_SIZE = kioskScreenLayout.orderingOutOfStockIconSize;

export type CartStockShortageScreenProps = {
  shortages: CartReserveItemResult[];
  onBackToCart: () => void;
  onRemoveUnavailable: () => void;
};

function resolveProductName(apiProductId: string, t: (key: string) => string): string {
  const numericId = Number.parseInt(apiProductId, 10);
  const product = Number.isFinite(numericId)
    ? findCatalogProductByApiId(numericId)
    : findCatalogProductByApiId(Number.NaN);
  if (product?.displayName) {
    return product.displayName;
  }
  if (product?.nameKey) {
    return t(product.nameKey);
  }
  return apiProductId;
}

export function CartStockShortageScreen({
  shortages,
  onBackToCart,
  onRemoveUnavailable,
}: CartStockShortageScreenProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingHorizontal: kioskScreenLayout.paymentReferenceContentPaddingHorizontal,
        },
        inner: {
          alignSelf: 'center',
          width: '100%',
          maxWidth: kioskScreenLayout.paymentReferenceMaxWidth,
          gap: kioskScreenLayout.paymentReferenceStatusCenterGap,
        },
        title: {
          ...displayTextStyle({ fontWeight: '700' }),
          fontSize: kioskScreenLayout.paymentReferenceTitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceTitleLineHeight,
          color: colors.title,
          textAlign: 'center',
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
        },
        list: {
          gap: kioskScreenLayout.menuSectionGap,
          paddingVertical: kioskScreenLayout.menuSectionGap,
        },
        itemRow: {
          gap: kioskScreenLayout.menuSectionGap * 0.35,
        },
        itemName: {
          ...displayTextStyle(),
          fontSize: kioskScreenLayout.featuredTitleSize,
          color: colors.menuSectionHeading,
        },
        itemStatus: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.featuredDescriptionSize,
          color: colors.menuSectionMuted,
        },
        actions: {
          gap: kioskScreenLayout.menuSectionGap,
          alignItems: 'center',
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="cart-stock-shortage-screen"
      showPattern
      contentAlign="center"
      onBack={onBackToCart}
      backButtonTestID="cart-stock-shortage-back"
      contentStyle={styles.content}>
      <View style={styles.inner}>
        <IconShoppingCartOff width={ICON_SIZE} height={ICON_SIZE} />
        <Text style={styles.title}>{t('stockShortage.title')}</Text>
        <Text style={styles.subtitle}>{t('stockShortage.subtitle')}</Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {shortages.map((item) => {
            const name = resolveProductName(item.productId, t);
            const statusKey =
              item.availableQuantity <= 0
                ? 'stockShortage.itemSoldOut'
                : 'stockShortage.itemLimited';
            return (
              <View key={item.productId} style={styles.itemRow}>
                <Text style={styles.itemName}>{name}</Text>
                <Text style={styles.itemStatus}>
                  {t(statusKey, { count: item.availableQuantity })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.actions}>
          <PaymentPrimaryCta
            label={t('stockShortage.backToCartCta')}
            showChevron={false}
            onPress={onBackToCart}
            testID="cart-stock-shortage-back-cta"
          />
          <PaymentPrimaryCta
            label={t('stockShortage.removeUnavailableCta')}
            showChevron={false}
            onPress={onRemoveUnavailable}
            testID="cart-stock-shortage-remove-cta"
          />
        </View>
      </View>
    </KioskScreenLayout>
  );
}
