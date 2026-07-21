import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  bodyTextStyle,
  displayTextStyle,
  kioskScreenLayout,
  useKioskScreenColors,
} from '@shared/theme';

import IconCheckCircle from '@assets/images/payment/outcome/icon-check-circle.svg';
import IconEmergencyHome from '@assets/images/payment/outcome/icon-emergency-home.svg';
import IconClockLoader from '@assets/images/payment/processing/icon-clock-loader.svg';
import IconDontClose from '@assets/images/payment/reference/icon-dont-close.svg';
import IconHourglass from '@assets/images/payment/reference/icon-hourglass.svg';
import IconReferenceError from '@assets/images/payment/reference/icon-reference-error.svg';

export type PaymentStatusVariant =
  | 'verifying'
  | 'error'
  | 'processing'
  | 'success'
  | 'fiscal_error';

export type PaymentStatusIllustrationProps = {
  variant: PaymentStatusVariant;
  title: string;
  /** Ignorado si se pasa `subtitleContent`. */
  subtitle?: string;
  subtitleContent?: ReactNode;
  /** Solo en verifying (Figma 51:106). */
  dontCloseLabel?: string;
  footer?: ReactNode;
};

function StatusIcon({
  variant,
  accentColor,
}: {
  variant: PaymentStatusVariant;
  accentColor: string;
}) {
  const statusIconSize = kioskScreenLayout.paymentReferenceErrorIconSize;

  if (variant === 'verifying') {
    return (
      <IconHourglass
        width={kioskScreenLayout.paymentReferenceHourglassWidth}
        height={kioskScreenLayout.paymentReferenceHourglassHeight}
        color={accentColor}
      />
    );
  }

  if (variant === 'processing') {
    return (
      <IconClockLoader width={statusIconSize} height={statusIconSize} color={accentColor} />
    );
  }

  if (variant === 'success') {
    return <IconCheckCircle width={statusIconSize} height={statusIconSize} />;
  }

  if (variant === 'fiscal_error') {
    return (
      <IconEmergencyHome width={statusIconSize} height={statusIconSize} color={accentColor} />
    );
  }

  return (
    <IconReferenceError width={statusIconSize} height={statusIconSize} />
  );
}

/** Ilustración centrada P12 / P12.1 / P13 / P14 / P14.1. */
export function PaymentStatusIllustration({
  variant,
  title,
  subtitle = '',
  subtitleContent,
  dontCloseLabel,
  footer,
}: PaymentStatusIllustrationProps) {
  const colors = useKioskScreenColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          alignItems: 'center',
          alignSelf: 'stretch',
          gap: kioskScreenLayout.paymentReferenceStatusCenterGap,
          maxWidth: kioskScreenLayout.paymentReferenceMaxWidth,
        },
        title: {
          ...displayTextStyle(),
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
        dontCloseRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: kioskScreenLayout.paymentReferenceDontCloseGap,
          marginTop: kioskScreenLayout.paymentReferenceSectionGap,
        },
        dontClose: {
          ...bodyTextStyle(),
          fontSize: kioskScreenLayout.paymentReferenceSubtitleSize,
          lineHeight: kioskScreenLayout.paymentReferenceSubtitleLineHeight,
          color: colors.paymentReferenceMuted,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.root}>
      <StatusIcon variant={variant} accentColor={colors.priceAccent} />
      <Text style={styles.title}>{title}</Text>
      {subtitleContent ?? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {variant === 'verifying' && dontCloseLabel ? (
        <View style={styles.dontCloseRow}>
          <IconDontClose
            width={kioskScreenLayout.paymentReferenceDontCloseIconSize}
            height={kioskScreenLayout.paymentReferenceDontCloseIconSize}
            color={colors.paymentReferenceMuted}
          />
          <Text style={styles.dontClose}>{dontCloseLabel}</Text>
        </View>
      ) : null}
      {footer}
    </View>
  );
}
