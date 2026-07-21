import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';

import { useKioskOrder, type CartLine } from '@shared/kiosk-order';
import { MenuCartBar } from '../menu/components/MenuCartBar';
import {
  CartAddMoreButton,
  CartCheckoutSheet,
  CartHeader,
  CartItemsList,
  CartScreenHeader,
} from './components';
import { useCartScreen } from './hooks';

export type CartScreenProps = {
  lines: CartLine[];
  itemCount: number;
  totalUsd: number;
  onBack: () => void;
  onAddMore: () => void;
  onIncrementLine: (lineId: string) => void;
  onDecrementLine: (lineId: string) => void;
  onRemoveLine: (lineId: string) => void;
  onPressNext: () => void;
  /** Storybook / pruebas: abre el sheet de checkout al montar (Figma 41-92). */
  initialCheckoutOpen?: boolean;
  onPressCheckoutPrimary?: () => void;
};

export function CartScreen({
  lines,
  itemCount,
  totalUsd,
  onBack,
  onAddMore,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  onPressNext,
  initialCheckoutOpen = false,
  onPressCheckoutPrimary,
}: CartScreenProps) {
  const colors = useKioskScreenColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        scroll: {
          flex: 1,
        },
        emptyWrap: {
          paddingHorizontal: kioskScreenLayout.cartHeaderPaddingHorizontal,
        },
        backdrop: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.cartCheckoutBackdrop,
          zIndex: 2,
        },
        checkoutWrap: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 3,
        },
      }),
    [colors],
  );
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('ordering');
  const [checkoutOpen, setCheckoutOpen] = useState(initialCheckoutOpen);
  const { cartLines } = useCartScreen(lines);
  const { totals: orderTotals } = useKioskOrder();

  const handleBack = useCallback(() => {
    if (checkoutOpen) {
      setCheckoutOpen(false);
      return;
    }
    onBack();
  }, [checkoutOpen, onBack]);

  const handlePressNext = useCallback(() => {
    setCheckoutOpen(true);
    onPressNext();
  }, [onPressNext]);

  const handleDismissCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  const handleCheckoutPrimary = useCallback(() => {
    onPressCheckoutPrimary?.();
  }, [onPressCheckoutPrimary]);

  const scrollBottomInset = checkoutOpen
    ? insets.bottom + kioskScreenLayout.cartCheckoutScrollBottomInset
    : insets.bottom + kioskScreenLayout.cartScrollBottomInset;

  return (
    <View style={styles.root} testID="ordering-cart">
      <CartScreenHeader
        paddingTop={insets.top + kioskScreenLayout.menuHeaderPaddingTop}
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scrollBottomInset }}
        showsVerticalScrollIndicator={false}>
        <CartHeader />
        {cartLines.length > 0 ? (
          <CartItemsList
            lines={cartLines}
            showAddMore={!checkoutOpen}
            onIncrement={onIncrementLine}
            onDecrement={onDecrementLine}
            onRemove={onRemoveLine}
            onAddMore={onAddMore}
          />
        ) : (
          <View style={styles.emptyWrap}>
            {!checkoutOpen ? <CartAddMoreButton onPress={onAddMore} /> : null}
          </View>
        )}
      </ScrollView>

      {checkoutOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common:back')}
          style={styles.backdrop}
          onPress={handleDismissCheckout}
          testID="cart-checkout-backdrop"
        />
      ) : null}

      {checkoutOpen ? (
        <View style={[styles.checkoutWrap, { paddingBottom: insets.bottom }]}>
          <CartCheckoutSheet
            totals={orderTotals}
            onPressPrimary={handleCheckoutPrimary}
          />
        </View>
      ) : (
        <MenuCartBar
          itemCount={itemCount}
          totalUsd={totalUsd}
          showNextButton
          onPressCart={() => {}}
          onPressNext={handlePressNext}
        />
      )}
    </View>
  );
}
