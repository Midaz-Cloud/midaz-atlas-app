import {
  isBundledImageSource,
  isRemoteHttpUri,
  normalizeImageUri,
  remoteUriFromImageSource,
} from '../kioskImageSource';

describe('kioskImageSource', () => {
  it('detects bundled assets', () => {
    expect(isBundledImageSource(42)).toBe(true);
    expect(isBundledImageSource({ uri: 'https://x.test/a.jpg' })).toBe(false);
  });

  it('extracts remote uri from source', () => {
    expect(remoteUriFromImageSource({ uri: ' https://cdn.test/p.png ' })).toBe(
      'https://cdn.test/p.png',
    );
  });

  it('normalizes local paths to file uri on android-like usage', () => {
    expect(normalizeImageUri('/data/user/0/cache/kiosk-images/a.img')).toBe(
      'file:///data/user/0/cache/kiosk-images/a.img',
    );
  });

  it('detects http(s) urls', () => {
    expect(isRemoteHttpUri('https://example.com/a.jpg')).toBe(true);
    expect(isRemoteHttpUri('file:///tmp/a.jpg')).toBe(false);
  });
});
