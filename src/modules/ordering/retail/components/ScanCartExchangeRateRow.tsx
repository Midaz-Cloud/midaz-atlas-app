import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useKioskScreenColors } from '@shared/theme';

import { retailScanLayout } from '../retailScanLayout';

export type ScanCartExchangeRateRowProps = {
  bcvRate: number;
};

export function ScanCartExchangeRateRow({ bcvRate }: ScanCartExchangeRateRowProps) {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: retailScanLayout.checkoutRateRowGap,
        },
        statusCol: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.checkoutRateDotGap,
          flexShrink: 1,
        },
        statusDot: {
          width: retailScanLayout.checkoutRateDotSize,
          height: retailScanLayout.checkoutRateDotSize,
          borderRadius: retailScanLayout.checkoutRateDotSize / 2,
          backgroundColor: '#22c55e',
        },
        statusLabel: {
          fontSize: retailScanLayout.checkoutRateLabelSize,
          lineHeight: retailScanLayout.checkoutRateLabelLineHeight,
          color: colors.menuSectionMuted,
        },
        rateLabel: {
          fontSize: retailScanLayout.checkoutRateLabelSize,
          lineHeight: retailScanLayout.checkoutRateLabelLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'right',
          flexShrink: 1,
        },
      }),
    [colors],
  );

  const rateFormatted = bcvRate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <View style={styles.row} testID="scan-cart-exchange-rate">
      <View style={styles.statusCol}>
        <View style={styles.statusDot} />
        <Text style={styles.statusLabel}>{t('scanCart.checkout.rateUpdated')}</Text>
      </View>
      <Text style={styles.rateLabel}>
        {t('scanCart.checkout.bcvRateUsd', { rate: rateFormatted })}
      </Text>
    </View>
  );
}
