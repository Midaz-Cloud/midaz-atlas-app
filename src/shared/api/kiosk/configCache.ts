import { isLiveConfigShape, mapLiveConfigToKioskConfigResponse } from './mappers/liveConfig';
import type { KioskConfigResponse } from './types';

/** Maps cached JSON (live API body or legacy mapped config) to `KioskConfigResponse`. */
export function mapCachedConfigBody(cached: unknown): KioskConfigResponse | null {
  if (!cached || typeof cached !== 'object') {
    return null;
  }
  if (isLiveConfigShape(cached)) {
    return mapLiveConfigToKioskConfigResponse(cached);
  }
  const legacy = cached as KioskConfigResponse;
  if (legacy.appearance && legacy.organization) {
    return {
      ...legacy,
      pagoMovilAccount: legacy.pagoMovilAccount ?? null,
    };
  }
  return null;
}

/**
 * True when config cache must be refetched (missing image fields or legacy mapped shape).
 */
export function isLiveConfigCacheStale(cached: unknown): boolean {
  if (!cached || typeof cached !== 'object') {
    return false;
  }
  // If it's a legacy mapped KioskConfigResponse instead of the live body, treat it as stale
  if (!('appearance' in cached) || !('organization' in cached)) {
    return true;
  }
  if (!isLiveConfigShape(cached)) {
    return true;
  }
  const appearance = (cached as any).appearance;
  if (!appearance || typeof appearance !== 'object') {
    return false;
  }
  return (
    !('pickupImage' in appearance) ||
    !('inStoreImage' in appearance) ||
    !('pagoMovilAccount' in (cached as Record<string, unknown>))
  );
}
