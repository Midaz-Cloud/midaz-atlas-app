import { useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import {
  getLocalCachedImageUri,
  resolveKioskCachedImageUri,
} from './kioskImageCache';
import type { ImageCacheKind } from './kioskImageTypes';
import {
  isBundledImageSource,
  isLocalCachedUri,
  remoteUriFromImageSource,
} from './kioskImageSource';

export type UseKioskCachedImageSourceResult = {
  resolvedSource?: ImageSourcePropType;
  remoteUri: string | null;
  isResolving: boolean;
  /** Bump to force a re-resolve after a stale disk path (ENOENT). */
  requestRetry: () => void;
};

function shouldResolveRemote(
  source: ImageSourcePropType | undefined,
  remoteUri: string | null,
): boolean {
  if (!source || !remoteUri) {
    return false;
  }
  if (isBundledImageSource(source)) {
    return false;
  }
  return !getLocalCachedImageUri(remoteUri);
}

/**
 * Remote images: first paint uses file:// from memory/index when already cached.
 * Never paints http(s) while a local file may exist — only falls back to remote
 * after resolve confirms there is no local copy.
 * Always verifies disk hits via resolve so a wiped file re-downloads.
 */
export function useKioskCachedImageSource(
  source?: ImageSourcePropType,
  cacheKind?: ImageCacheKind,
): UseKioskCachedImageSourceResult {
  const remoteUri = useMemo(
    () => (source != null ? remoteUriFromImageSource(source) : null),
    [source],
  );

  const [retryNonce, setRetryNonce] = useState(0);
  const requestRetry = () => setRetryNonce((n) => n + 1);

  const initialSource = useMemo((): ImageSourcePropType | undefined => {
    if (!source) {
      return undefined;
    }
    if (isBundledImageSource(source)) {
      return source;
    }
    if (!remoteUri) {
      return undefined;
    }
    const localHit = getLocalCachedImageUri(remoteUri);
    if (localHit) {
      return { uri: localHit };
    }
    return undefined;
  }, [remoteUri, source, retryNonce]);

  const [resolvedSource, setResolvedSource] = useState<ImageSourcePropType | undefined>(
    initialSource,
  );
  const [isResolving, setIsResolving] = useState(() =>
    shouldResolveRemote(source, remoteUri),
  );

  useEffect(() => {
    if (!source) {
      setResolvedSource(undefined);
      setIsResolving(false);
      return;
    }
    if (isBundledImageSource(source)) {
      setResolvedSource(source);
      setIsResolving(false);
      return;
    }
    if (!remoteUri) {
      setResolvedSource(undefined);
      setIsResolving(false);
      return;
    }

    const localHit = getLocalCachedImageUri(remoteUri);
    if (localHit) {
      setResolvedSource({ uri: localHit });
      setIsResolving(false);
    } else {
      setIsResolving(true);
      setResolvedSource((prev) => {
        if (prev && typeof prev === 'object' && 'uri' in prev && typeof prev.uri === 'string') {
          return isLocalCachedUri(prev.uri) ? prev : undefined;
        }
        return undefined;
      });
    }

    let cancelled = false;

    void resolveKioskCachedImageUri(remoteUri, cacheKind)
      .then((uri) => {
        if (cancelled || !uri) {
          return;
        }
        setResolvedSource({ uri });
        setIsResolving(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setResolvedSource({ uri: remoteUri });
        setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [remoteUri, source, cacheKind, retryNonce]);

  return { resolvedSource, remoteUri, isResolving, requestRetry };
}
