import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageErrorEventData,
  type ImageResizeMode,
  type ImageSourcePropType,
  type ImageStyle,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useKioskScreenColors } from '@shared/theme';
import { forgetLocalCachedImage } from '@shared/images/kioskImageCache';
import { useKioskCachedImageSource } from '@shared/images/useKioskCachedImageSource';
import type { ImageCacheKind } from '@shared/images/kioskImageTypes';
import {
  isBundledImageSource,
  isLocalCachedUri,
} from '@shared/images/kioskImageSource';

import IconBrokenImage from '@assets/images/ordering/menu/icon-broken-image.svg';

function uriFromSource(source: ImageSourcePropType | undefined): string | null {
  if (
    source &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    'uri' in source &&
    typeof source.uri === 'string'
  ) {
    return source.uri;
  }
  return null;
}

export type KioskCachedImageProps = {
  source?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  brokenIconSize?: number;
  /** Disk folder hint when resolving/downloading (e.g. modifiers). */
  cacheKind?: ImageCacheKind;
  testID?: string;
  onLoad?: () => void;
  onError?: () => void;
};

/**
 * Remote images are persisted under DocumentDir/.../images and reused across screens.
 * Prefer this component for any catalog/config remote image (products, modifiers, logo, cover).
 * Bundled assets (require()) pass through unchanged.
 *
 * Flow: local file:// (memory/index) → else resolve disk (download if needed) → remote http last.
 * Bootstrap warms the cache via prefetchKioskSessionImages before the UI is ready.
 */
export function KioskCachedImage({
  source,
  style,
  containerStyle,
  resizeMode = 'contain',
  brokenIconSize = 48,
  cacheKind,
  testID,
  onLoad,
  onError,
}: KioskCachedImageProps) {
  const colors = useKioskScreenColors();
  const { resolvedSource, remoteUri, isResolving, requestRetry } =
    useKioskCachedImageSource(source, cacheKind);
  const [loadFailed, setLoadFailed] = useState(false);
  const [diskRetryUsed, setDiskRetryUsed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
    setDiskRetryUsed(false);
  }, [remoteUri]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        brokenContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.productDetailHeroBg,
        },
      }),
    [colors],
  );

  const bundled = source != null && isBundledImageSource(source);
  const hasRemoteSource = Boolean(remoteUri);
  const missingImage = !bundled && source != null && !hasRemoteSource;
  const waitingForLocalCache =
    !bundled && hasRemoteSource && !resolvedSource && isResolving;
  const showBroken =
    loadFailed ||
    missingImage ||
    (!bundled && hasRemoteSource && !resolvedSource && !isResolving);

  if (!source) {
    return containerStyle ? <View style={containerStyle} testID={testID} /> : null;
  }

  // Disk lookup in progress — solid placeholder, not broken icon / not http.
  if (waitingForLocalCache) {
    return (
      <View
        style={[styles.brokenContainer, containerStyle]}
        testID={testID ? `${testID}-resolving` : undefined}
      />
    );
  }

  if (showBroken) {
    return (
      <View
        style={[styles.brokenContainer, containerStyle]}
        testID={testID ? `${testID}-broken` : undefined}>
        <IconBrokenImage
          width={brokenIconSize}
          height={brokenIconSize}
          accessibilityElementsHidden
        />
      </View>
    );
  }

  const paintedUri = uriFromSource(resolvedSource);

  return (
    <Image
      source={resolvedSource!}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={(event: NativeSyntheticEvent<ImageErrorEventData>) => {
        const nativeError = event?.nativeEvent?.error ?? 'unknown';
        const fromDisk = paintedUri != null && isLocalCachedUri(paintedUri);
        console.warn(
          '[KioskImages] IMAGE onError',
          `kind=${cacheKind ?? 'unknown'}`,
          `fromDisk=${fromDisk}`,
          `testID=${testID ?? '-'}`,
          `painted=${paintedUri ?? '-'}`,
          `remote=${remoteUri ?? '-'}`,
          `error=${nativeError}`,
        );
        // Stale index/memory after reconcile wiped the file — forget and re-download once.
        if (fromDisk && remoteUri && !diskRetryUsed) {
          setDiskRetryUsed(true);
          forgetLocalCachedImage(remoteUri);
          requestRetry();
          onError?.();
          return;
        }
        setLoadFailed(true);
        onError?.();
      }}
      accessibilityIgnoresInvertColors
      testID={testID}
    />
  );
}
