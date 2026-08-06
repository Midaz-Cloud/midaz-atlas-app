import { useMemo, useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveKioskAppearanceCopy } from '@shared/api/kiosk/mappers/resolveKioskAppearanceCopy';
import { showKioskDevUi, getKioskAdminPasscode } from '@shared/config';
import { useSessionLocale } from '@shared/i18n';
import { useKioskAppearance, useKioskSession } from '@shared/session';
import { brand, bodyTextStyle, displayTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import { appearanceTextColor } from './appearanceColors';
import {
  resolveHomeCoverImageUrl,
  resolveHomeLogoImageUrl,
} from './kioskHomeImages';
import {
  HomeBackground,
  HomeDeviceInfoPanel,
  HomeKioskConfigDebugPanel,
  HomeOrganizationLogo,
  LanguageIndicatorBadge,
  EcrConnectTestButton,
  EcrPaymentTestButton,
  PrinterTestButton,
  FiscalHealthTestButton,
  FiscalEmitTestButton,
  SettlementMailTestButton,
  TouchToStartCta,
  AdminPasscodeModal,
} from './components';

type HomeScreenProps = {
  onStart: () => void;
  onLanguagePress: () => void;
  languageSwitcherEnabled?: boolean;
  onAdminPress?: () => void;
};

/** Gap between CTA and physical bottom edge (safe area + visual margin). */
const CTA_BOTTOM_MARGIN = kioskScale(64);

/** P1 · Home / Screensaver — kiosk entry. */
const DEFAULT_SUBTITLE_COLOR = 'rgba(255, 255, 255, 0.85)';

export function HomeScreen({
  onStart,
  onLanguagePress,
  languageSwitcherEnabled = false,
  onAdminPress,
}: HomeScreenProps) {
  const { t } = useTranslation('introduction');
  const { locale } = useSessionLocale();
  const insets = useSafeAreaInsets();
  const appearance = useKioskAppearance();
  const { runtimeConfig } = useKioskSession();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const clickTimesRef = useRef<number[]>([]);

  const handleLogoPress = () => {
    const adminPasscode = getKioskAdminPasscode();
    if (!adminPasscode || adminPasscode.trim() === '') {
      // Feature is blocked because passcode is not configured in environment variables
      return;
    }
    const now = Date.now();
    const validClicks = clickTimesRef.current.filter((time) => now - time <= 3000);
    validClicks.push(now);
    clickTimesRef.current = validClicks;

    if (validClicks.length >= 5) {
      clickTimesRef.current = [];
      setShowAdminModal(true);
    }
  };

  const coverImageUrl = resolveHomeCoverImageUrl(runtimeConfig?.raw);
  const logoImageUrl = resolveHomeLogoImageUrl(runtimeConfig?.raw);

  const appearanceCopy = appearance
    ? resolveKioskAppearanceCopy(
        {
          title: appearance.title,
          subtitle: appearance.subtitle,
          translations: appearance.translations,
        },
        locale,
      )
    : { title: '', subtitle: '' };

  const headline = appearanceCopy.title || t('home.headline');
  const subtitle = appearanceCopy.subtitle || t('home.subtitle');

  const headlineColor = appearanceTextColor(appearance?.titleColor ?? undefined, brand.cream);
  const subtitleColor = appearanceTextColor(
    appearance?.subtitleColor ?? undefined,
    DEFAULT_SUBTITLE_COLOR,
  );
  /** CTA ring, label and icon use `titleColor` (same as headline). */
  const accentColor = headlineColor;

  const usesApiSubtitleColor = Boolean(appearance?.subtitleColor?.trim());
  const devUi = showKioskDevUi();

  const heroTextStyles = useMemo(
    () =>
      StyleSheet.create({
        headline: { color: headlineColor },
        subtitle: {
          color: subtitleColor,
          ...(usesApiSubtitleColor
            ? null
            : {
                textShadowColor: 'rgba(255, 255, 255, 0.35)',
                textShadowOffset: { width: 0, height: kioskScale(2) },
                textShadowRadius: kioskScale(6),
              }),
        },
      }),
    [headlineColor, subtitleColor, usesApiSubtitleColor],
  );

  return (
    <View style={styles.root} testID="introduction-home">
      <HomeBackground coverImageUrl={coverImageUrl}>
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + kioskScale(219),
              paddingHorizontal: kioskScale(20),
            },
          ]}
          pointerEvents="box-none">
          {languageSwitcherEnabled ? (
            <View
              style={[
                styles.languageBadge,
                { top: insets.top + kioskScale(20), right: kioskScale(20) },
              ]}>
              <LanguageIndicatorBadge onPress={onLanguagePress} />
            </View>
          ) : null}

          {devUi ? (
            <View
              style={[
                styles.deviceInfoWrap,
                { top: insets.top + kioskScale(12), left: kioskScale(12) },
              ]}>
              <HomeDeviceInfoPanel />
            </View>
          ) : null}

          <View style={styles.heroSection}>
            <Pressable onPress={handleLogoPress}>
              <View style={styles.brandBlock}>
                <HomeOrganizationLogo logoUrl={logoImageUrl} />
              </View>
            </Pressable>
            <View style={styles.headlineBlock}>
              <Text
                style={[styles.headline, heroTextStyles.headline]}
                testID="introduction-home-headline">
                {headline}
              </Text>
              <Text
                style={[styles.subtitle, heroTextStyles.subtitle]}
                testID="introduction-home-subtitle">
                {subtitle}
              </Text>
            </View>
            <HomeKioskConfigDebugPanel />
          </View>

          <View
            style={[
              styles.bottomBlock,
              { marginBottom: insets.bottom + CTA_BOTTOM_MARGIN },
            ]}>
            {devUi ? (
              <View
                style={[
                  styles.printerTestWrap,
                  { left: kioskScale(69), bottom: insets.bottom + kioskScale(24) },
                ]}>
                <View style={styles.devToolsColumn}>
                  <EcrConnectTestButton />
                  <EcrPaymentTestButton />
                  <PrinterTestButton />
                  <FiscalHealthTestButton />
                  <FiscalEmitTestButton />
                  <SettlementMailTestButton />
                </View>
              </View>
            ) : null}
            <TouchToStartCta onPress={onStart} accentColor={accentColor} />
          </View>
        </View>
      </HomeBackground>

      <AdminPasscodeModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setShowAdminModal(false);
          onAdminPress?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageBadge: {
    position: 'absolute',
    zIndex: 2,
  },
  deviceInfoWrap: {
    position: 'absolute',
    zIndex: 2,
    maxWidth: '48%',
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    gap: kioskScale(50),
  },
  brandBlock: {
    paddingTop: kioskScale(50),
    alignItems: 'center',
  },
  headlineBlock: {
    alignItems: 'center',
    width: '100%',
    maxWidth: kioskScale(795),
    gap: kioskScale(15),
  },
  headline: {
    ...displayTextStyle(),
    fontSize: kioskScale(86.4),
    lineHeight: kioskScale(104),
    color: brand.cream,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: kioskScale(5.76) },
    textShadowRadius: kioskScale(3),
  },
  subtitle: {
    ...bodyTextStyle(),
    fontSize: kioskScale(52),
    lineHeight: kioskScale(81),
    color: brand.white,
    textAlign: 'center',
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
  },
  printerTestWrap: {
    position: 'absolute',
    zIndex: 3,
  },
  devToolsColumn: {
    gap: kioskScale(12),
    alignItems: 'flex-start',
  },
});
