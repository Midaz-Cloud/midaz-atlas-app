import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { KioskCachedImage } from '@shared/components/KioskCachedImage';

import { introductionLayout } from '../../theme';
import type { HomeImageLoadState } from '../homeImageLoad';

type HomeOrganizationLogoProps = {
  logoUrl: string | null;
  onLogoLoadStateChange?: (state: HomeImageLoadState) => void;
};

export function HomeOrganizationLogo({
  logoUrl,
  onLogoLoadStateChange,
}: HomeOrganizationLogoProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const hasUrl = logoUrl != null && logoUrl.length > 0;
  const showLogo = hasUrl && !loadFailed;

  useEffect(() => {
    setLoadFailed(false);
    if (!hasUrl) {
      onLogoLoadStateChange?.('missing');
      return;
    }
    onLogoLoadStateChange?.('loading');
  }, [logoUrl, hasUrl, onLogoLoadStateChange]);

  return (
    <View
      style={styles.wrap}
      testID={
        showLogo ? 'introduction-home-organization-logo' : 'introduction-home-organization-logo-empty'
      }>
      {showLogo ? (
        <KioskCachedImage
          source={{ uri: logoUrl! }}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => onLogoLoadStateChange?.('loaded')}
          onError={() => {
            setLoadFailed(true);
            onLogoLoadStateChange?.('error');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: introductionLayout.logoWidth,
    height: introductionLayout.logoHeight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
