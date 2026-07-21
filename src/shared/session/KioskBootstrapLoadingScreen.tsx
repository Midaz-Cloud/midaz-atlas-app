import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { kioskScreenColors, kioskScreenLayout } from '@shared/theme';
import { displayTextStyle } from '@shared/theme';
import type { ImageSyncProgress } from '@shared/images/kioskImageTypes';

import type { KioskBootstrapPhase } from './kioskBootstrapState';

type KioskBootstrapLoadingScreenProps = {
  phase?: KioskBootstrapPhase | null;
  imageProgress?: ImageSyncProgress | null;
};

const PHASE_I18N_KEY: Record<KioskBootstrapPhase, string> = {
  login: 'bootstrap.phaseLogin',
  config: 'bootstrap.phaseConfig',
  products: 'bootstrap.phaseProducts',
  images: 'bootstrap.phaseImages',
};

export function KioskBootstrapLoadingScreen({
  phase,
  imageProgress,
}: KioskBootstrapLoadingScreenProps) {
  const { t } = useTranslation('session');
  const phaseKey = phase ? PHASE_I18N_KEY[phase] : null;
  const showImageProgress = phase === 'images' && imageProgress != null && imageProgress.total > 0;
  const progressRatio = showImageProgress
    ? Math.min(1, imageProgress.done / Math.max(1, imageProgress.total))
    : 0;

  return (
    <View style={styles.centered} testID="kiosk-session-loading">
      <ActivityIndicator size="large" color={kioskScreenColors.title} />
      <Text style={styles.loadingText}>{t('bootstrap.loading')}</Text>
      {phaseKey ? <Text style={styles.phaseText}>{t(phaseKey)}</Text> : null}

      {showImageProgress ? (
        <View style={styles.progressBlock} testID="kiosk-image-sync-progress">
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {t('bootstrap.imagesProgress', {
              done: imageProgress.done,
              total: imageProgress.total,
            })}
          </Text>
          <Text style={styles.progressHint}>
            {t('bootstrap.imagesRemaining', { count: imageProgress.remaining })}
          </Text>
          {imageProgress.failed > 0 ? (
            <Text style={styles.progressFail} testID="kiosk-image-sync-failures">
              {t('bootstrap.imagesFailed', { count: imageProgress.failed })}
            </Text>
          ) : null}
        </View>
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
  loadingText: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.menuSectionTitleSize,
    color: kioskScreenColors.title,
    textAlign: 'center',
  },
  phaseText: {
    fontSize: kioskScreenLayout.searchFontSize,
    color: kioskScreenColors.menuSectionMuted,
    textAlign: 'center',
  },
  progressBlock: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    gap: kioskScreenLayout.menuSectionGap * 0.5,
    marginTop: kioskScreenLayout.menuSectionGap,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 12,
    borderRadius: 6,
    backgroundColor: kioskScreenColors.creamInset,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: kioskScreenColors.priceAccent,
    borderRadius: 6,
  },
  progressText: {
    ...displayTextStyle(),
    fontSize: kioskScreenLayout.searchFontSize,
    color: kioskScreenColors.title,
    textAlign: 'center',
  },
  progressHint: {
    fontSize: kioskScreenLayout.searchFontSize * 0.9,
    color: kioskScreenColors.menuSectionMuted,
    textAlign: 'center',
  },
  progressFail: {
    fontSize: kioskScreenLayout.searchFontSize * 0.9,
    color: kioskScreenColors.priceAccent,
    textAlign: 'center',
  },
});
