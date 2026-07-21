import { NativeModules, TurboModuleRegistry } from 'react-native';

type BlobUtilModule = typeof import('react-native-blob-util').default;

let blobUtilModule: BlobUtilModule | null | undefined;
let diskCacheAvailable: boolean | undefined;

const NATIVE_MODULE_NAME = 'ReactNativeBlobUtil';

/**
 * Probe native linkage without loading react-native-blob-util JS (its fs module calls
 * getConstants() at import time and throws when the native binary was not rebuilt).
 */
function isNativeBlobUtilLinked(): boolean {
  try {
    const fromTurbo = TurboModuleRegistry.get(NATIVE_MODULE_NAME);
    if (fromTurbo != null) {
      return true;
    }
    const fromLegacy = NativeModules[NATIVE_MODULE_NAME];
    return fromLegacy != null;
  } catch {
    return false;
  }
}

/**
 * Lazy-load react-native-blob-util. Returns null when the native module is not linked.
 */
export function getBlobUtilModule(): BlobUtilModule | null {
  if (blobUtilModule !== undefined) {
    return blobUtilModule;
  }

  if (!isNativeBlobUtilLinked()) {
    blobUtilModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-blob-util').default as BlobUtilModule;
    const cacheDir = mod?.fs?.dirs?.CacheDir;
    if (typeof cacheDir === 'string' && cacheDir.length > 0) {
      blobUtilModule = mod;
      return mod;
    }
  } catch {
    // Native module missing or not rebuilt after install.
  }

  blobUtilModule = null;
  return null;
}

export function isKioskImageDiskCacheAvailable(): boolean {
  if (diskCacheAvailable !== undefined) {
    return diskCacheAvailable;
  }
  diskCacheAvailable = getBlobUtilModule() != null;
  return diskCacheAvailable;
}

export function resetBlobUtilProbeForTests(): void {
  blobUtilModule = undefined;
  diskCacheAvailable = undefined;
}
