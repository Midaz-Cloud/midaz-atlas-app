import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { KioskCachedImage } from '@shared/components/KioskCachedImage';

import HomeMask from '@assets/images/home/home-mask.svg';
import HomeScrim from '@assets/images/home/home-scrim.svg';

import type { HomeImageLoadState } from '../homeImageLoad';

type HomeBackgroundProps = {
  children: ReactNode;
  coverImageUrl?: string | null;
  onCoverLoadStateChange?: (state: HomeImageLoadState) => void;
};

export function HomeBackground({
  children,
  coverImageUrl,
  onCoverLoadStateChange,
}: HomeBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const [remoteCoverFailed, setRemoteCoverFailed] = useState(false);

  const hasUrl = coverImageUrl != null && coverImageUrl.length > 0;
  const showCover = hasUrl && !remoteCoverFailed;

  useEffect(() => {
    setRemoteCoverFailed(false);
    if (!hasUrl) {
      onCoverLoadStateChange?.('missing');
      return;
    }
    onCoverLoadStateChange?.('loading');
  }, [coverImageUrl, hasUrl, onCoverLoadStateChange]);

  return (
    <View style={styles.root}>
      <View style={styles.photo} pointerEvents="none">
        {showCover ? (
          <KioskCachedImage
            source={{ uri: coverImageUrl! }}
            style={styles.photoImage}
            resizeMode="cover"
            onLoad={() => onCoverLoadStateChange?.('loaded')}
            onError={() => {
              setRemoteCoverFailed(true);
              onCoverLoadStateChange?.('error');
            }}
          />
        ) : null}
      </View>

      <View style={styles.overlays} pointerEvents="none">
        <HomeMask
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
        <HomeScrim
          width={width}
          height={height}
          preserveAspectRatio="none"
        />
      </View>

      <View style={styles.foreground} pointerEvents="box-none" collapsable={false}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  photo: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  overlays: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  foreground: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    elevation: 2,
  },
});
