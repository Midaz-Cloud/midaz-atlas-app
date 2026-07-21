import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { OrderTotals } from '@modules/ordering/hooks/useOrderTotals';
import { useBcvExchangeRate, useKioskPricing } from '@shared/session';
import { useKioskScreenColors } from '@shared/theme';

import { retailScanLayout } from '../retailScanLayout';
import { ScanCartCheckoutSummary } from './ScanCartCheckoutSummary';
import { ScanCartExchangeRateRow } from './ScanCartExchangeRateRow';
import { ScanCartPayButton } from './ScanCartPayButton';

const SECTION_DIVIDER_COLOR = '#F3F4F6';

export type ScanCartFooterProps = {
  itemCount: number;
  totals: OrderTotals;
  onPressPay: () => void;
};

export function ScanCartFooter({ itemCount, totals, onPressPay }: ScanCartFooterProps) {
  const colors = useKioskScreenColors();
  const pricing = useKioskPricing();
  const bcvRate = useBcvExchangeRate();
  const primaryCurrency = pricing?.primaryCurrency ?? 'USD';
  const showExchangeRate = primaryCurrency.toUpperCase() === 'USD' && bcvRate != null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        footer: {
          backgroundColor: colors.cardBackground,
          borderTopWidth: retailScanLayout.sectionDividerWidth,
          borderTopColor: SECTION_DIVIDER_COLOR,
          paddingHorizontal: retailScanLayout.footerPaddingH,
          paddingTop: retailScanLayout.footerPaddingTop,
          paddingBottom: retailScanLayout.footerPaddingBottom,
          gap: retailScanLayout.footerGap,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.footer} testID="scan-cart-footer">
      <ScanCartCheckoutSummary itemCount={itemCount} totals={totals} />
      {showExchangeRate ? <ScanCartExchangeRateRow bcvRate={bcvRate} /> : null}
      <ScanCartPayButton onPress={onPressPay} />
    </View>
  );
}
