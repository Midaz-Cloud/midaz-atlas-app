import liveConfigFixture from '../fixtures/live/config.response.json';
import { isLiveConfigCacheStale, mapCachedConfigBody } from '../configCache';
import { mapLiveConfigToKioskConfigResponse } from '../mappers/liveConfig';
import type { KioskConfigResponseLive } from '../liveApi.types';

describe('configCache', () => {
  const liveBody = liveConfigFixture as KioskConfigResponseLive;

  it('maps live API body from cache', () => {
    const mapped = mapCachedConfigBody(liveBody);
    expect(mapped?.appearance.pickupImage).toBeNull();
    expect(mapped?.appearance.inStoreImage).toBeNull();
  });

  it('maps legacy mapped config from cache', () => {
    const mapped = mapLiveConfigToKioskConfigResponse(liveBody);
    const fromLegacy = mapCachedConfigBody(mapped);
    expect(fromLegacy?.id).toBe(mapped.id);
  });

  it('treats legacy mapped cache as stale', () => {
    const mapped = mapLiveConfigToKioskConfigResponse(liveBody);
    expect(isLiveConfigCacheStale(mapped)).toBe(true);
  });

  it('treats live body without image keys as stale', () => {
    const stale = {
      ...liveBody,
      appearance: { ...liveBody.appearance },
    };
    delete (stale.appearance as Record<string, unknown>).pickupImage;
    delete (stale.appearance as Record<string, unknown>).inStoreImage;
    expect(isLiveConfigCacheStale(stale)).toBe(true);
  });

  it('accepts fresh live body with image keys', () => {
    const fresh = {
      ...liveBody,
      appearance: {
        ...liveBody.appearance,
        pickupImage: '/uploads/pickup.png',
        inStoreImage: '/uploads/instore.png',
      },
      pagoMovilAccount: null,
    };
    expect(isLiveConfigCacheStale(fresh)).toBe(false);
  });

  it('treats live body without pagoMovilAccount key as stale', () => {
    const stale = { ...liveBody };
    delete (stale as Record<string, unknown>).pagoMovilAccount;
    expect(isLiveConfigCacheStale(stale)).toBe(true);
  });
});
