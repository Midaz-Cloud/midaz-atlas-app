import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getBlobUtilModule, isKioskImageDiskCacheAvailable } from './blobUtilLazy';
import { isLocalCachedUri, isRemoteHttpUri, normalizeImageUri } from './kioskImageSource';
import type {
  ImageCacheKind,
  ImageEnsureResult,
  ImageSyncEntry,
  ImageSyncProgress,
  ImageSyncSummary,
} from './kioskImageTypes';

const CACHE_INDEX_KEY = '@kiosk/imageCacheIndex/v2';
const LEGACY_CACHE_INDEX_KEY = '@kiosk/imageCacheIndex/v1';
const APP_FOLDER = 'com.midazatlasapp';
const IMAGES_FOLDER = 'images';
/** Per-image download timeout (AbortController cancels hung fetches). */
const DOWNLOAD_TIMEOUT_MS = 60_000;
/** Serial downloads on AF910 — parallel blob-util / bandwidth sharing caused mass failures. */
const DOWNLOAD_CONCURRENCY = 1;
/** Extra attempt after a timeout / interrupted download before marking failed. */
const DOWNLOAD_TIMEOUT_RETRIES = 1;

type CacheIndexEntry = {
  path: string;
  kind: ImageCacheKind;
};

type CacheIndex = Record<string, CacheIndexEntry>;

let imagesRootPath: string | null = null;
let indexPromise: Promise<CacheIndex> | null = null;
/** Sync mirror of the last loaded/persisted index for first-paint file:// lookups. */
let indexSnapshot: CacheIndex | null = null;
let indexWriteChain: Promise<void> = Promise.resolve();
const memoryUriByRemote = new Map<string, string>();
const kindByRemote = new Map<string, ImageCacheKind>();
const inFlight = new Map<string, Promise<string>>();

function setIndexSnapshot(index: CacheIndex): CacheIndex {
  indexSnapshot = index;
  return index;
}

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  return match ? `.${match[1]!.toLowerCase()}` : '.img';
}

function toImageUri(localPath: string): string {
  if (localPath.startsWith('file://')) {
    return localPath;
  }
  return Platform.OS === 'android' ? `file://${localPath}` : localPath;
}

function pathFromLocalUri(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

/**
 * Drop a stale file:// mapping (index + memory) so the next resolve re-downloads.
 * Used when Image reports ENOENT for a path we still considered cached.
 */
export function forgetLocalCachedImage(remoteUrl: string): void {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return;
  }
  memoryUriByRemote.delete(trimmed);
  if (indexSnapshot && indexSnapshot[trimmed]) {
    const { [trimmed]: _removed, ...rest } = indexSnapshot;
    setIndexSnapshot(rest);
    indexPromise = Promise.resolve(rest);
    indexWriteChain = indexWriteChain
      .catch(() => undefined)
      .then(async () => {
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(rest));
      });
  }
}

function rememberRemoteUrl(remoteUrl: string, resolvedUri: string): string {
  memoryUriByRemote.set(remoteUrl, resolvedUri);
  return resolvedUri;
}

function rememberRemoteMapping(remoteUrl: string, localPath: string): string {
  const imageUri = toImageUri(localPath);
  memoryUriByRemote.set(remoteUrl, imageUri);
  return imageUri;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      await worker(items[current]!, current);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    message.includes('Image cache timeout') ||
    lower.includes('timed out') ||
    (lower.includes('timeout') && !lower.includes('http'))
  );
}

/** Transient native / network failures worth one retry (same as timeout). */
function isRetryableDownloadError(error: unknown): boolean {
  if (isTimeoutError(error)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('download interrupted') ||
    lower.includes('network request failed') ||
    lower.includes('failed to connect')
  );
}

function timeoutErrorMessage(url: string): string {
  return `Image cache timeout after ${DOWNLOAD_TIMEOUT_MS}ms (${url})`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const triplet = (a << 16) | (b << 8) | c;
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 63] : '=';
  }
  return result;
}

/**
 * Download via fetch (reliable cancel on AF910) then write file with blob-util.
 * Avoids react-native-blob-util FileStorage → DocumentDir which fails with
 * "Download interrupted" for most multi-MB product images on this device.
 */
async function downloadUrlToPath(url: string, destPath: string): Promise<string> {
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    throw new Error('Disk image cache unavailable');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('Empty image body');
    }

    const base64 = arrayBufferToBase64(buffer);
    await blobUtil.fs.writeFile(destPath, base64, 'base64');
    console.info(
      '[KioskImages] DOWNLOAD wrote',
      `bytes=${buffer.byteLength}`,
      `ms=${Date.now() - startedAt}`,
      destPath,
    );
    return destPath;
  } catch (error) {
    await unlinkQuietly(destPath);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(timeoutErrorMessage(url));
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function unlinkQuietly(path: string): Promise<void> {
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    return;
  }
  try {
    if (await blobUtil.fs.exists(path)) {
      await blobUtil.fs.unlink(path);
    }
  } catch {
    // ignore
  }
}

async function ensureDir(path: string): Promise<void> {
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    throw new Error('Disk image cache unavailable');
  }
  const exists = await blobUtil.fs.isDir(path);
  if (!exists) {
    await blobUtil.fs.mkdir(path);
  }
}

/**
 * `{DocumentDir}/com.midazatlasapp/images`
 */
export async function getImagesRootDir(): Promise<string> {
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    throw new Error('Disk image cache unavailable');
  }
  if (imagesRootPath) {
    return imagesRootPath;
  }
  const root = `${blobUtil.fs.dirs.DocumentDir}/${APP_FOLDER}/${IMAGES_FOLDER}`;
  await ensureDir(`${blobUtil.fs.dirs.DocumentDir}/${APP_FOLDER}`);
  await ensureDir(root);
  for (const kind of ['config', 'categories', 'products', 'modifiers'] as const) {
    await ensureDir(`${root}/${kind}`);
  }
  imagesRootPath = root;
  console.info('[KioskImages] root', root);
  return root;
}

function destPathFor(root: string, kind: ImageCacheKind, remoteUrl: string): string {
  return `${root}/${kind}/${hashUrl(remoteUrl)}${extensionFromUrl(remoteUrl)}`;
}

async function loadIndex(): Promise<CacheIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (!raw) {
        // Drop legacy v1 key if present (old CacheDir layout).
        void AsyncStorage.removeItem(LEGACY_CACHE_INDEX_KEY).catch(() => undefined);
        return setIndexSnapshot({});
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const next: CacheIndex = {};
        for (const [url, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            next[url] = { path: value, kind: 'products' };
          } else if (
            value &&
            typeof value === 'object' &&
            typeof (value as CacheIndexEntry).path === 'string'
          ) {
            const entry = value as CacheIndexEntry;
            next[url] = {
              path: entry.path,
              kind: entry.kind ?? 'products',
            };
          }
        }
        return setIndexSnapshot(next);
      } catch {
        return setIndexSnapshot({});
      }
    })();
  }
  return indexPromise;
}

async function persistIndex(index: CacheIndex): Promise<void> {
  setIndexSnapshot(index);
  indexPromise = Promise.resolve(index);
  indexWriteChain = indexWriteChain
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    });
  await indexWriteChain;
}

/** Update in-memory index immediately; persist AsyncStorage without blocking downloads. */
async function updateIndexEntry(url: string, path: string, kind: ImageCacheKind): Promise<void> {
  const index = setIndexSnapshot({ ...(await loadIndex()), [url]: { path, kind } });
  indexPromise = Promise.resolve(index);
  indexWriteChain = indexWriteChain
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    });
}

/** Synchronous lookup for already-resolved URIs in this session (local or remote fallback). */
export function getMemoryCachedImageUri(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }
  return memoryUriByRemote.get(trimmed) ?? null;
}

/**
 * Synchronous file:// (or absolute path) for first paint when the image is already cached.
 * Prefers memory, then the in-session index snapshot — never returns http(s).
 */
export function getLocalCachedImageUri(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) {
    return null;
  }

  const memoryHit = memoryUriByRemote.get(trimmed);
  if (memoryHit && isLocalCachedUri(memoryHit)) {
    return memoryHit.startsWith('file://') ? memoryHit : toImageUri(memoryHit);
  }

  const indexedPath = indexSnapshot?.[trimmed]?.path;
  if (indexedPath) {
    return rememberRemoteMapping(trimmed, indexedPath);
  }

  return null;
}

export async function isKioskImageCached(remoteUrl: string): Promise<boolean> {
  const normalizedRemote = remoteUrl.trim();
  if (!normalizedRemote || !isRemoteHttpUri(normalizedRemote)) {
    return false;
  }
  if (memoryUriByRemote.has(normalizedRemote)) {
    const remembered = memoryUriByRemote.get(normalizedRemote)!;
    if (remembered.startsWith('file://') || remembered.startsWith('/')) {
      return true;
    }
  }
  if (!isKioskImageDiskCacheAvailable()) {
    return false;
  }
  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    return false;
  }
  const index = await loadIndex();
  const existing = index[normalizedRemote];
  return Boolean(existing?.path && (await blobUtil.fs.exists(existing.path)));
}

function fileNameFromPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? path;
}

/**
 * Verify local file or download into typed folder. Never throws for network errors.
 */
export async function ensureLocalImage(entry: ImageSyncEntry): Promise<ImageEnsureResult> {
  const url = entry.url.trim();
  const kind = entry.kind;
  if (!url || !isRemoteHttpUri(url)) {
    console.warn('[KioskImages] FAIL invalid-url', `kind=${kind}`, url);
    return { status: 'failed', url, kind, error: 'invalid-url' };
  }

  kindByRemote.set(url, kind);

  if (!isKioskImageDiskCacheAvailable()) {
    console.warn('[KioskImages] FAIL disk-unavailable', `kind=${kind}`, url);
    rememberRemoteUrl(url, url);
    return { status: 'failed', url, kind, error: 'disk-unavailable', localUri: url };
  }

  const blobUtil = getBlobUtilModule();
  if (!blobUtil) {
    console.warn('[KioskImages] FAIL disk-unavailable', `kind=${kind}`, url);
    rememberRemoteUrl(url, url);
    return { status: 'failed', url, kind, error: 'disk-unavailable', localUri: url };
  }

  try {
    const root = await getImagesRootDir();
    const index = await loadIndex();
    const indexed = index[url];
    const preferredPath =
      indexed?.path && indexed.kind === kind
        ? indexed.path
        : destPathFor(root, kind, url);
    const fileName = fileNameFromPath(preferredPath);

    if (await blobUtil.fs.exists(preferredPath)) {
      const localUri = rememberRemoteMapping(url, preferredPath);
      if (!indexed || indexed.path !== preferredPath || indexed.kind !== kind) {
        await updateIndexEntry(url, preferredPath, kind);
      }
      console.info(
        '[KioskImages] SKIP cached',
        `kind=${kind}`,
        `file=${fileName}`,
        `path=${preferredPath}`,
        url,
      );
      return { status: 'skipped', url, kind, localUri };
    }

    // Stale index path that no longer exists — clean and re-download.
    if (indexed?.path && indexed.path !== preferredPath) {
      await unlinkQuietly(indexed.path);
    }

    console.info(
      '[KioskImages] DOWNLOAD start',
      `kind=${kind}`,
      `file=${fileName}`,
      `path=${preferredPath}`,
      url,
    );

    await unlinkQuietly(preferredPath);

    let savedPath: string | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt <= DOWNLOAD_TIMEOUT_RETRIES; attempt += 1) {
      try {
        if (attempt > 0) {
          console.info('[KioskImages] RETRY', `kind=${kind}`, `attempt=${attempt + 1}`, url);
          await unlinkQuietly(preferredPath);
        }
        savedPath = await downloadUrlToPath(url, preferredPath);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryableDownloadError(error) || attempt >= DOWNLOAD_TIMEOUT_RETRIES) {
          throw error;
        }
      }
    }

    if (!savedPath) {
      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }

    await updateIndexEntry(url, savedPath, kind);
    const localUri = rememberRemoteMapping(url, savedPath);
    console.info(
      '[KioskImages] DOWNLOAD ok',
      `kind=${kind}`,
      `file=${fileNameFromPath(savedPath)}`,
      `path=${savedPath}`,
      url,
    );
    return { status: 'downloaded', url, kind, localUri };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[KioskImages] FAIL', `kind=${kind}`, url, message);
    rememberRemoteUrl(url, url);
    return { status: 'failed', url, kind, error: message, localUri: url };
  }
}

/**
 * Strict sync: check each URL, skip if on disk, else download (parallel pool).
 * Failures are counted and do not abort the run. Hung requests are aborted.
 */
export async function syncKioskImagesStrict(
  entries: ImageSyncEntry[],
  onProgress?: (progress: ImageSyncProgress) => void,
): Promise<ImageSyncSummary> {
  const unique = new Map<string, ImageSyncEntry>();
  for (const entry of entries) {
    const url = entry.url.trim();
    if (!url || !isRemoteHttpUri(url)) {
      continue;
    }
    if (!unique.has(url)) {
      unique.set(url, { url, kind: entry.kind });
    }
  }

  const list = [...unique.values()];
  const total = list.length;
  let skipped = 0;
  let downloaded = 0;
  let failed = 0;
  let done = 0;
  const failedUrls: string[] = [];

  console.info(
    '[KioskImages] SYNC start',
    `total=${total}`,
    `concurrency=${DOWNLOAD_CONCURRENCY}`,
    `timeoutMs=${DOWNLOAD_TIMEOUT_MS}`,
  );

  const emit = (currentUrl?: string) => {
    onProgress?.({
      done,
      total,
      skipped,
      downloaded,
      failed,
      remaining: Math.max(0, total - done),
      currentUrl,
    });
  };

  emit();

  await mapPool(list, DOWNLOAD_CONCURRENCY, async (entry, index) => {
    console.info(
      '[KioskImages] SYNC item',
      `${index + 1}/${total}`,
      `kind=${entry.kind}`,
      entry.url,
    );
    const result = await ensureLocalImage(entry);
    if (result.status === 'skipped') {
      skipped += 1;
    } else if (result.status === 'downloaded') {
      downloaded += 1;
    } else {
      failed += 1;
      failedUrls.push(entry.url);
    }
    done += 1;
    emit(entry.url);
  });

  // Flush any pending index writes before finishing.
  await indexWriteChain.catch(() => undefined);

  console.info(
    '[KioskImages] SYNC done',
    `total=${total}`,
    `skipped=${skipped}`,
    `downloaded=${downloaded}`,
    `failed=${failed}`,
  );
  if (failedUrls.length > 0) {
    console.warn('[KioskImages] SYNC failed urls', failedUrls.join(' | '));
  }

  // Only prune orphans for kinds included in this sync. A config-only poll must
  // never delete products/categories/modifiers (that caused mass ENOENT).
  const kindsInSync = [...new Set(list.map((e) => e.kind))];
  void reconcileKioskImageCache(
    list.map((e) => e.url),
    { kinds: kindsInSync },
  ).catch(() => undefined);

  return { total, skipped, downloaded, failed, failedUrls };
}

/**
 * Runtime resolve: local file first; on miss download into typed folder; else remote URL.
 */
export async function resolveKioskCachedImageUri(
  remoteUrl: string,
  kindHint?: ImageCacheKind,
): Promise<string> {
  const normalizedRemote = remoteUrl.trim();
  if (!normalizedRemote) {
    return normalizedRemote;
  }
  if (!isRemoteHttpUri(normalizedRemote)) {
    return normalizeImageUri(normalizedRemote);
  }

  const pending = inFlight.get(normalizedRemote);
  if (pending) {
    return pending;
  }

  const kind =
    kindHint ?? kindByRemote.get(normalizedRemote) ?? 'products';

  const task = (async () => {
    const memoryHit = memoryUriByRemote.get(normalizedRemote);
    if (memoryHit && isLocalCachedUri(memoryHit)) {
      const blobUtil = getBlobUtilModule();
      const localPath = pathFromLocalUri(memoryHit);
      if (blobUtil && (await blobUtil.fs.exists(localPath))) {
        return memoryHit;
      }
      console.warn(
        '[KioskImages] STALE local missing',
        `kind=${kind}`,
        localPath,
        normalizedRemote,
      );
      forgetLocalCachedImage(normalizedRemote);
    }

    const result = await ensureLocalImage({ url: normalizedRemote, kind });
    if (result.localUri) {
      return result.localUri;
    }
    return rememberRemoteUrl(normalizedRemote, normalizedRemote);
  })().finally(() => {
    inFlight.delete(normalizedRemote);
  });

  inFlight.set(normalizedRemote, task);
  return task;
}

/** @deprecated Prefer syncKioskImagesStrict with typed entries. */
export async function prefetchKioskImages(urls: Iterable<string>): Promise<void> {
  const entries: ImageSyncEntry[] = [...urls]
    .map((url) => url.trim())
    .filter(isRemoteHttpUri)
    .map((url) => ({ url, kind: 'products' as const }));
  await syncKioskImagesStrict(entries);
}

export type ReconcileKioskImageCacheOptions = {
  /**
   * Only remove orphans whose indexed kind is in this list.
   * Omit to prune every kind (full-session sync).
   */
  kinds?: ImageCacheKind[];
};

/**
 * Delete cached files / index entries not in `liveUrls`.
 * When `kinds` is set, entries of other kinds are kept (scoped syncs).
 */
export async function reconcileKioskImageCache(
  liveUrls: Iterable<string>,
  options?: ReconcileKioskImageCacheOptions,
): Promise<void> {
  const live = new Set(
    [...liveUrls].map((url) => url.trim()).filter(isRemoteHttpUri),
  );
  const kindsFilter =
    options?.kinds && options.kinds.length > 0 ? new Set(options.kinds) : null;

  const shouldTouchRemote = (remote: string, kind?: ImageCacheKind): boolean => {
    if (!kindsFilter) {
      return true;
    }
    const resolvedKind = kind ?? kindByRemote.get(remote);
    return resolvedKind != null && kindsFilter.has(resolvedKind);
  };

  for (const remote of [...memoryUriByRemote.keys()]) {
    if (live.has(remote)) {
      continue;
    }
    if (!shouldTouchRemote(remote)) {
      continue;
    }
    memoryUriByRemote.delete(remote);
    kindByRemote.delete(remote);
  }

  if (!isKioskImageDiskCacheAvailable()) {
    return;
  }

  const index = await loadIndex();
  const next: CacheIndex = {};
  const removals: string[] = [];

  for (const [remote, entry] of Object.entries(index)) {
    if (kindsFilter && !kindsFilter.has(entry.kind)) {
      next[remote] = entry;
      continue;
    }
    if (live.has(remote)) {
      next[remote] = entry;
    } else {
      removals.push(entry.path);
      memoryUriByRemote.delete(remote);
      kindByRemote.delete(remote);
      console.info(
        '[KioskImages] RECONCILE unlink',
        `kind=${entry.kind}`,
        entry.path,
        remote,
      );
    }
  }

  if (removals.length > 0) {
    console.info(
      '[KioskImages] RECONCILE',
      `kinds=${kindsFilter ? [...kindsFilter].join(',') : 'all'}`,
      `removed=${removals.length}`,
      `kept=${Object.keys(next).length}`,
    );
  }

  await Promise.allSettled(removals.map((path) => unlinkQuietly(path)));
  await persistIndex(next);
}

export async function clearKioskImageCache(): Promise<void> {
  memoryUriByRemote.clear();
  kindByRemote.clear();
  inFlight.clear();
  indexPromise = null;
  indexSnapshot = null;
  indexWriteChain = Promise.resolve();
  const blobUtil = getBlobUtilModule();
  if (imagesRootPath && blobUtil) {
    try {
      await blobUtil.fs.unlink(imagesRootPath);
    } catch {
      // ignore
    }
  }
  imagesRootPath = null;
  await AsyncStorage.multiRemove([CACHE_INDEX_KEY, LEGACY_CACHE_INDEX_KEY]);
}
