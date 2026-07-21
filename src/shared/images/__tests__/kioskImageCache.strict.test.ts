const mockExists = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockIsDir = jest.fn();
const mockUnlink = jest.fn();
const mockGlobalFetch = jest.fn();

jest.mock('../blobUtilLazy', () => ({
  getBlobUtilModule: () => ({
    fs: {
      dirs: { DocumentDir: '/data/docs', CacheDir: '/data/cache' },
      exists: (...args: unknown[]) => mockExists(...args),
      isDir: (...args: unknown[]) => mockIsDir(...args),
      mkdir: (...args: unknown[]) => mockMkdir(...args),
      unlink: (...args: unknown[]) => mockUnlink(...args),
      writeFile: (...args: unknown[]) => mockWriteFile(...args),
    },
  }),
  isKioskImageDiskCacheAvailable: () => true,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

import { clearKioskImageCache, ensureLocalImage, syncKioskImagesStrict, reconcileKioskImageCache, getLocalCachedImageUri, forgetLocalCachedImage } from '../kioskImageCache';
import { isLocalCachedUri } from '../kioskImageSource';

function okImageResponse(): Response {
  const bytes = new Uint8Array([137, 80, 78, 71]); // tiny PNG header-ish
  return {
    ok: true,
    status: 200,
    arrayBuffer: async () => bytes.buffer,
  } as Response;
}

describe('strict image sync', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockIsDir.mockResolvedValue(true);
    mockMkdir.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockExists.mockResolvedValue(false);
    mockGlobalFetch.mockResolvedValue(okImageResponse());
    global.fetch = mockGlobalFetch as unknown as typeof fetch;
    await clearKioskImageCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('skips download when file already exists', async () => {
    mockExists.mockResolvedValue(true);

    const result = await ensureLocalImage({
      url: 'https://example.com/a.jpg',
      kind: 'products',
    });

    expect(result.status).toBe('skipped');
    expect(mockGlobalFetch).not.toHaveBeenCalled();
  });

  it('downloads when missing and reports downloaded', async () => {
    const result = await ensureLocalImage({
      url: 'https://example.com/b.jpg',
      kind: 'products',
    });

    expect(result.status).toBe('downloaded');
    expect(mockGlobalFetch).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('retries once on timeout then succeeds', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockGlobalFetch
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(okImageResponse());

    const result = await ensureLocalImage({
      url: 'https://example.com/retry.jpg',
      kind: 'products',
    });

    expect(result.status).toBe('downloaded');
    expect(mockGlobalFetch).toHaveBeenCalledTimes(2);
  });

  it('retries once on Download interrupted then succeeds', async () => {
    mockGlobalFetch
      .mockRejectedValueOnce(new Error('Download interrupted.'))
      .mockResolvedValueOnce(okImageResponse());

    const result = await ensureLocalImage({
      url: 'https://example.com/interrupted.jpg',
      kind: 'products',
    });

    expect(result.status).toBe('downloaded');
    expect(mockGlobalFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-timeout errors', async () => {
    mockGlobalFetch.mockRejectedValueOnce(new Error('HTTP 404'));

    const result = await ensureLocalImage({
      url: 'https://example.com/missing.jpg',
      kind: 'products',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('HTTP 404');
    expect(mockGlobalFetch).toHaveBeenCalledTimes(1);
  });

  it('continues sync when one image fails', async () => {
    mockGlobalFetch
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(okImageResponse())
      .mockResolvedValueOnce(okImageResponse());

    const progress: Array<{ done: number; failed: number }> = [];
    const summary = await syncKioskImagesStrict(
      [
        { url: 'https://example.com/fail.jpg', kind: 'products' },
        { url: 'https://example.com/ok1.jpg', kind: 'products' },
        { url: 'https://example.com/ok2.jpg', kind: 'modifiers' },
      ],
      (p) => progress.push({ done: p.done, failed: p.failed }),
    );

    expect(summary.total).toBe(3);
    expect(summary.failed).toBe(1);
    expect(summary.downloaded).toBe(2);
    expect(summary.failedUrls).toEqual(['https://example.com/fail.jpg']);
    expect(progress[progress.length - 1]?.done).toBe(3);
  });

  it('config-only reconcile does not delete product files', async () => {
    mockExists.mockResolvedValue(true);

    await ensureLocalImage({
      url: 'https://example.com/product.png',
      kind: 'products',
    });
    await ensureLocalImage({
      url: 'https://example.com/logo.png',
      kind: 'config',
    });

    mockUnlink.mockClear();

    await reconcileKioskImageCache(['https://example.com/logo.png'], {
      kinds: ['config'],
    });

    expect(getLocalCachedImageUri('https://example.com/product.png')).toBeTruthy();
    expect(
      mockUnlink.mock.calls.some((call) => String(call[0]).includes('/products/')),
    ).toBe(false);
  });

  it('forgetLocalCachedImage clears stale file:// mapping', async () => {
    mockExists.mockResolvedValue(true);
    const url = 'https://example.com/stale.png';
    await ensureLocalImage({ url, kind: 'products' });
    expect(getLocalCachedImageUri(url)).toBeTruthy();
    expect(isLocalCachedUri(getLocalCachedImageUri(url)!)).toBe(true);

    forgetLocalCachedImage(url);
    expect(getLocalCachedImageUri(url)).toBeNull();
  });
});
