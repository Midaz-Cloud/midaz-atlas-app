import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconHourglass from '@assets/images/payment/reference/icon-hourglass.svg';

import { PaymentPrimaryCta } from '@modules/payment/components/PaymentPrimaryCta';

export type InactivityWarningScreenProps = {
  secondsRemaining: number;
  onContinue: () => void;
};

/** P16 · Timeout de inactividad (Figma 66:2). */
export function InactivityWarningScreen({
  secondsRemaining,
  onContinue,
}: InactivityWarningScreenProps) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          width: '100%',
          backgroundColor: colors.screenBackground,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: kioskScreenLayout.paymentReferenceContentPaddingHorizontal,
        },
        content: {
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
        countdown: {
          ...bodyTextStyle({ fontWeight: '600' }),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentOutcomeAccent,
          textAlign: 'center',
          marginBottom: kioskScreenLayout.paymentReferenceSectionGap,
        },
      }),
    [colors],
  );

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      testID="kiosk-inactivity-warning-screen">
      <View style={styles.content}>
        <IconHourglass
          width={kioskScreenLayout.paymentReferenceHourglassWidth}
          height={kioskScreenLayout.paymentReferenceHourglassHeight}
          color={colors.priceAccent}
        />
        <Text style={styles.title}>{t('inactivity.title')}</Text>
        <View style={styles.subtitleBlock}>
          <Text style={styles.subtitle}>{t('inactivity.subtitleLine1')}</Text>
          <Text style={styles.subtitle}>{t('inactivity.subtitleLine2')}</Text>
        </View>
        <Text style={styles.countdown}>
          {t('inactivity.countdown', { seconds: secondsRemaining })}
        </Text>
        <PaymentPrimaryCta
          label={t('inactivity.continueCta')}
          showChevron={false}
          onPress={onContinue}
          testID="kiosk-inactivity-continue"
        />
      </View>
    </View>
  );
}
