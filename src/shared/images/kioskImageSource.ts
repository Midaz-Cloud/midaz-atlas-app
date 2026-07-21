import type { ImageSourcePropType } from 'react-native';

export function isBundledImageSource(source: ImageSourcePropType): source is number {
  return typeof source === 'number';
}

export function remoteUriFromImageSource(source: ImageSourcePropType): string | null {
  if (isBundledImageSource(source)) {
    return null;
  }
  const uri = (source as { uri?: string }).uri;
  return typeof uri === 'string' && uri.trim().length > 0 ? uri.trim() : null;
}

export function isRemoteHttpUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isLocalCachedUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

/** Normalizes remote http(s) URLs; passes through local file paths. */
export function normalizeImageUri(uri: string): string {
  const trimmed = uri.trim();
  if (isLocalCachedUri(trimmed)) {
    return trimmed.startsWith('file://') ? trimmed : `file://${trimmed}`;
  }
  return trimmed;
}

export function imageSourceFromUri(uri: string): ImageSourcePropType {
  return { uri: normalizeImageUri(uri) };
}
