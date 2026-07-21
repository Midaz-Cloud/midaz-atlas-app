import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { displayTextStyle, useKioskScreenColors } from '@shared/theme';
import { kioskScale } from '@shared/utils/kioskLayout';

import IconScanBarcode from '@assets/images/ordering/retail/icon-scan-barcode.svg';

import { retailScanLayout } from '../retailScanLayout';

export function ScanPromptCard() {
  const { t } = useTranslation('ordering');
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          alignItems: 'flex-start',
          paddingHorizontal: retailScanLayout.promptPaddingH,
          paddingVertical: retailScanLayout.promptPaddingV,
          borderRadius: retailScanLayout.promptRadius,
          backgroundColor: colors.cardBackground,
          borderWidth: retailScanLayout.promptBorderWidth,
          borderColor: colors.productDetailBorder,
          gap: retailScanLayout.promptContentGap,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: retailScanLayout.promptHeaderGap,
        },
        iconCircle: {
          width: retailScanLayout.promptIconCircleSize,
          height: retailScanLayout.promptIconCircleSize,
          borderRadius: retailScanLayout.promptIconCircleSize / 2,
          backgroundColor: colors.addButtonMuted,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        scanLabel: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.promptLabelSize,
          lineHeight: retailScanLayout.promptLabelLineHeight,
          letterSpacing: kioskScale(2),
          color: colors.priceAccent,
        },
        headline: {
          ...displayTextStyle(),
          fontSize: retailScanLayout.promptHeadlineSize,
          lineHeight: retailScanLayout.promptHeadlineLineHeight,
          color: colors.title,
          textAlign: 'left',
        },
        description: {
          fontSize: retailScanLayout.promptLineSize,
          lineHeight: retailScanLayout.promptLineLineHeight,
          color: colors.menuSectionMuted,
          textAlign: 'left',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card} testID="scan-prompt-card">
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <IconScanBarcode
            width={retailScanLayout.promptIconSize}
            height={retailScanLayout.promptIconSize}
            color={colors.priceAccent}
          />
        </View>
        <Text style={styles.scanLabel}>{t('scanCart.prompt.title')}</Text>
      </View>
      <Text style={styles.headline}>{t('scanCart.prompt.line1')}</Text>
      <Text style={styles.description}>{t('scanCart.prompt.line2')}</Text>
    </View>
  );
}
