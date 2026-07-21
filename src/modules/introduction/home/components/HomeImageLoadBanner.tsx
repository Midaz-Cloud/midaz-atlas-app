import { StyleSheet, Text, View } from 'react-native';

import { showKioskDevUi } from '@shared/config';
import { brand, bodyTextStyle } from '@shared/theme';
import { kioskScale } from '@shared/utils';

import {
  homeImageStatusIsProblem,
  homeImageStatusLabel,
  type HomeImageLoadReport,
} from '../homeImageLoad';

type HomeImageLoadBannerProps = {
  cover: HomeImageLoadReport;
  logo: HomeImageLoadReport;
  uploadsBaseUrl: string;
};

function ImageLoadRow({ title, report }: { title: string; report: HomeImageLoadReport }) {
  const isProblem = homeImageStatusIsProblem(report.state);

  return (
    <View style={styles.row}>
      <Text style={[styles.rowTitle, isProblem && styles.rowTitleError]}>
        {title}: {homeImageStatusLabel(report.state)}
      </Text>
      {report.relativePath ? (
        <Text style={styles.meta}>Ruta: {report.relativePath}</Text>
      ) : (
        <Text style={styles.meta}>Ruta: —</Text>
      )}
      {report.url ? (
        <Text style={styles.meta}>URL: {report.url}</Text>
      ) : (
        <Text style={styles.meta}>URL: —</Text>
      )}
    </View>
  );
}

/** On-screen cover/logo load status for debugging remote images. */
export function HomeImageLoadBanner({ cover, logo, uploadsBaseUrl }: HomeImageLoadBannerProps) {
  if (!showKioskDevUi()) {
    return null;
  }

  return (
    <View style={styles.banner} testID="introduction-home-image-load-banner">
      <Text style={styles.bannerTitle}>Imágenes remotas</Text>
      <Text style={styles.meta}>Base uploads: {uploadsBaseUrl}</Text>
      <ImageLoadRow title="Cover" report={cover} />
      <ImageLoadRow title="Logo" report={logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: kioskScale(1),
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: kioskScale(14),
    paddingVertical: kioskScale(10),
    borderRadius: kioskScale(8),
    maxWidth: kioskScale(720),
    gap: kioskScale(8),
  },
  bannerTitle: {
    ...bodyTextStyle(),
    color: brand.gold,
    fontSize: kioskScale(20),
    fontWeight: '700',
  },
  row: {
    gap: kioskScale(4),
  },
  rowTitle: {
    ...bodyTextStyle(),
    color: brand.cream,
    fontSize: kioskScale(18),
    fontWeight: '600',
  },
  rowTitleError: {
    color: '#ffb4b4',
  },
  meta: {
    ...bodyTextStyle(),
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: kioskScale(15),
  },
});
