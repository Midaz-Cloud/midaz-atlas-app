import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { bodyTextStyle, displayTextStyle, kioskScreenColors, kioskScreenLayout } from '@shared/theme';
import { kioskScale } from '@shared/utils';

export type KioskStartupErrorKind = 'not_registered' | 'blocked' | 'unreachable' | 'other';

export type KioskStartupErrorScreenProps = {
  message: string;
  statusCode?: number;
  deviceSerial: string | null;
  /** Segundos entre reintentos automáticos (0 = sin reintento automático). */
  autoRetrySeconds?: number;
  onRetry: () => void;
};

/**
 * Qué le decimos a quien está frente al kiosko. 401 cubre "no registrado",
 * "revocado" y "complemento inactivo" (el backend manda el detalle en `message`);
 * 403 es suscripción bloqueada; sin código = no hubo respuesta.
 */
export function classifyStartupError(statusCode?: number): KioskStartupErrorKind {
  if (statusCode === 401) {
    return 'not_registered';
  }
  if (statusCode === 403) {
    return 'blocked';
  }
  if (statusCode == null) {
    return 'unreachable';
  }
  return 'other';
}

/**
 * Pantalla de arranque fallido. Antes solo decía "No se pudo conectar" y había que
 * sacar el serial por adb para registrar el equipo; ahora el serial va en grande y
 * la app reintenta sola, así que al asignarlo en el Hub entra sin tocar el kiosko.
 */
export function KioskStartupErrorScreen({
  message,
  statusCode,
  deviceSerial,
  autoRetrySeconds = 30,
  onRetry,
}: KioskStartupErrorScreenProps) {
  const { t } = useTranslation('session');
  const kind = classifyStartupError(statusCode);
  const [secondsLeft, setSecondsLeft] = useState(autoRetrySeconds);

  useEffect(() => {
    if (autoRetrySeconds <= 0) {
      return;
    }
    setSecondsLeft(autoRetrySeconds);
    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRetry();
          return autoRetrySeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRetrySeconds, onRetry]);

  const hint =
    kind === 'not_registered'
      ? t('bootstrap.authErrorNotRegistered')
      : kind === 'blocked'
        ? t('bootstrap.authErrorBlocked')
        : kind === 'unreachable'
          ? t('bootstrap.authErrorUnreachable')
          : t('bootstrap.authErrorGeneric');

  return (
    <View style={styles.centered} testID="kiosk-session-auth-error">
      <Text style={styles.errorTitle}>{t('bootstrap.authErrorTitle')}</Text>
      <Text style={styles.hint} testID="kiosk-session-auth-error-hint">
        {hint}
      </Text>
      {deviceSerial ? (
        <View style={styles.serialBox} testID="kiosk-session-auth-error-serial">
          <Text style={styles.serialLabel}>{t('bootstrap.serialLabel')}</Text>
          <Text style={styles.serialValue} selectable>
            {deviceSerial}
          </Text>
        </View>
      ) : null}
      <Text style={styles.errorMessage}>{message}</Text>
      <Text style={styles.retryHint} onPress={onRetry} testID="kiosk-session-auth-error-retry">
        {t('bootstrap.retry')}
      </Text>
      {autoRetrySeconds > 0 ? (
        <Text style={styles.autoRetry} testID="kiosk-session-auth-error-countdown">
          {t('bootstrap.autoRetry', { count: secondsLeft })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: kioskScreenColors.screenBackground,
    paddingHorizontal: kioskScreenLayout.menuHorizontalPadding,
    gap: kioskScreenLayout.menuSectionGap,
  },
  errorTitle: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    color: kioskScreenColors.title,
    textAlign: 'center',
  },
  hint: {
    ...bodyTextStyle(),
    fontSize: kioskScreenLayout.searchFontSize,
    color: kioskScreenColors.title,
    textAlign: 'center',
    maxWidth: kioskScale(820),
  },
  serialBox: {
    alignItems: 'center',
    gap: kioskScale(8),
    paddingVertical: kioskScale(24),
    paddingHorizontal: kioskScale(48),
    borderRadius: kioskScale(24),
    borderWidth: kioskScale(3),
    borderColor: kioskScreenColors.priceAccent,
  },
  serialLabel: {
    ...bodyTextStyle({ fontWeight: '700' }),
    fontSize: kioskScale(22),
    color: kioskScreenColors.menuSectionMuted,
    textTransform: 'uppercase',
    letterSpacing: kioskScale(2),
  },
  serialValue: {
    ...displayTextStyle({ fontWeight: '700' }),
    fontSize: kioskScale(56),
    lineHeight: kioskScale(68),
    color: kioskScreenColors.priceAccent,
    letterSpacing: kioskScale(3),
  },
  errorMessage: {
    ...bodyTextStyle(),
    fontSize: kioskScale(20),
    color: kioskScreenColors.menuSectionMuted,
    textAlign: 'center',
    maxWidth: kioskScale(820),
  },
  retryHint: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    color: kioskScreenColors.priceAccent,
  },
  autoRetry: {
    ...bodyTextStyle(),
    fontSize: kioskScale(20),
    color: kioskScreenColors.menuSectionMuted,
  },
});
