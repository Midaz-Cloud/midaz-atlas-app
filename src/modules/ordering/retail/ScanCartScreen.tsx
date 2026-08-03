import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartSessionLimitModal } from '@modules/ordering/cart/components/CartSessionLimitModal';
import { useCartScreen } from '@modules/ordering/cart/hooks/useCartScreen';
import { getScanIndexDebugInfo } from '@shared/catalog/catalogStore';
import { kioskScreenLayout, useKioskScreenColors } from '@shared/theme';
import { useKioskOrder } from '@shared/kiosk-order';
import { kioskScale } from '@shared/utils/kioskLayout';

import {
  ScanCartFooter,
  ScanCartHeader,
  ScanCartItemsList,
  ScanCartSectionHeader,
  ScanPromptCard,
} from './components';
import { useBarcodeScanner, useScanCartScreen } from './hooks';
import { logRetailScan } from './logRetailScan';
import { retailScanLayout } from './retailScanLayout';

export type ScanCartScreenProps = {
  onBack: () => void;
  onProceedToPayment: () => void;
};

export function ScanCartScreen({ onBack, onProceedToPayment }: ScanCartScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useKioskScreenColors();
  const {
    lines,
    itemCount,
    incrementLine,
    decrementLine,
    removeLine,
    resetOrder,
    totals,
  } = useKioskOrder();
  const [sessionLimitVisible, setSessionLimitVisible] = useState(false);
  const { cartLines } = useCartScreen(lines, itemCount);
  const { handleScan, errorMessage } = useScanCartScreen({
    onSessionLimit: () => setSessionLimitVisible(true),
  });
  const { inputRef, hiddenInputProps } = useBarcodeScanner({ onScan: handleScan });

  const handleIncrement = useCallback(
    (lineId: string) => {
      const result = incrementLine(lineId);
      if (!result.ok && result.reason === 'session-limit') {
        setSessionLimitVisible(true);
      }
    },
    [incrementLine],
  );

  useEffect(() => {
    logRetailScan('ScanCartScreen mounted — scan index snapshot', getScanIndexDebugInfo());
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.screenBackground,
        },
        body: {
          flex: 1,
        },
        scannerZone: {
          backgroundColor: colors.creamInset,
          paddingHorizontal: retailScanLayout.horizontalPadding,
          paddingTop: retailScanLayout.scannerZonePaddingTop,
          paddingBottom: retailScanLayout.scannerZonePaddingBottom,
        },
        errorBanner: {
          marginTop: kioskScale(10),
          paddingHorizontal: kioskScale(16),
          paddingVertical: kioskScale(10),
          borderRadius: kioskScale(12),
          backgroundColor: '#fef2f2',
          borderWidth: kioskScale(2),
          borderColor: '#fecaca',
        },
        errorText: {
          fontSize: retailScanLayout.promptLineSize,
          lineHeight: retailScanLayout.promptLineLineHeight,
          color: '#b91c1c',
          textAlign: 'left',
        },
        cartPanel: {
          flex: 1,
          backgroundColor: colors.cardBackground,
        },
        cartScroll: {
          flex: 1,
        },
        cartScrollContent: {
          flexGrow: 1,
          paddingBottom: retailScanLayout.cartPanelContentPaddingBottom,
        },
        hiddenInput: {
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        },
        footerWrap: {
          paddingBottom: insets.bottom,
          backgroundColor: colors.cardBackground,
        },
      }),
    [colors, insets.bottom],
  );

  const handleClear = useCallback(() => {
    if (itemCount > 0) {
      resetOrder();
    }
  }, [itemCount, resetOrder]);

  return (
    <View style={styles.root} testID="scan-cart-screen">
      <TextInput
        ref={inputRef}
        {...hiddenInputProps}
        style={styles.hiddenInput}
      />

      <ScanCartHeader
        paddingTop={insets.top + kioskScreenLayout.menuHeaderPaddingTop}
        onBack={onBack}
      />

      <View style={styles.body}>
        <View style={styles.scannerZone}>
          <ScanPromptCard />
          {errorMessage ? (
            <View style={styles.errorBanner} testID="scan-cart-error">
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cartPanel} testID="scan-cart-panel">
          <ScanCartSectionHeader
            itemCount={itemCount}
            onClear={handleClear}
            clearDisabled={itemCount === 0}
          />
          <ScrollView
            style={styles.cartScroll}
            contentContainerStyle={styles.cartScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {cartLines.length > 0 ? (
              <ScanCartItemsList
                lines={cartLines}
                onIncrement={handleIncrement}
                onDecrement={decrementLine}
                onRemove={removeLine}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>

      {itemCount > 0 ? (
        <View style={styles.footerWrap}>
          <ScanCartFooter
            itemCount={itemCount}
            totals={totals}
            onPressPay={onProceedToPayment}
          />
        </View>
      ) : null}

      <CartSessionLimitModal
        visible={sessionLimitVisible}
        onClose={() => setSessionLimitVisible(false)}
      />
    </View>
  );
}
