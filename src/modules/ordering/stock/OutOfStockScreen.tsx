import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { KioskScreenLayout } from '@shared/components';
import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconShoppingCartOff from '@assets/images/ordering/stock/icon-shopping-cart-off.svg';

import { PaymentPrimaryCta } from '@modules/payment/components/PaymentPrimaryCta';

export type OutOfStockScreenProps = {
  onBack: () => void;
  onViewSimilar: () => void;
};

const ICON_SIZE = kioskScreenLayout.orderingOutOfStockIconSize;

/** P17 · Sin stock (Figma 66:44). */
export function OutOfStockScreen({ onBack, onViewSimilar }: OutOfStockScreenProps) {
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
          alignItems: 'center',
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
        subtitleBlock: {
          alignItems: 'center',
          paddingBottom: kioskScreenLayout.paymentOutcomeBlockGap,
        },
        subtitle: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  return (
    <KioskScreenLayout
      testID="ordering-out-of-stock-screen"
      showPattern
      contentAlign="center"
      onBack={onBack}
      backButtonTestID="ordering-out-of-stock-back"
      contentStyle={styles.content}>
      <View style={styles.inner}>
        <IconShoppingCartOff width={ICON_SIZE} height={ICON_SIZE} />
        <Text style={styles.title}>{t('stock.title')}</Text>
        <View style={styles.subtitleBlock}>
          <Text style={styles.subtitle}>{t('stock.subtitleLine1')}</Text>
          <Text style={styles.subtitle}>{t('stock.subtitleLine2')}</Text>
        </View>
        <PaymentPrimaryCta
          label={t('stock.viewSimilarCta')}
          showChevron={false}
          onPress={onViewSimilar}
          testID="ordering-out-of-stock-view-similar"
        />
      </View>
    </KioskScreenLayout>
  );
}
