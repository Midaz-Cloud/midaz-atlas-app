import { resolveKioskImageUrl } from '@shared/api/kiosk';
import type { KioskConfigResponse } from '@shared/api/kiosk';
import { getKioskApiBaseUrl, getKioskUploadsBaseUrl } from '@shared/config/api';

/** Uploads base (defaults to API URL) + `appearance.coverImage`. */
export function resolveHomeCoverImageUrl(
  config: KioskConfigResponse | null | undefined,
): string | null {
  return resolveKioskImageUrl(
    config?.appearance.coverImage ?? null,
    getKioskUploadsBaseUrl(),
  );
}

/** Uploads base (defaults to API URL) + `organization.logo`. */
export function resolveHomeLogoImageUrl(
  config: KioskConfigResponse | null | undefined,
): string | null {
  return resolveKioskImageUrl(config?.organization.logo ?? null, getKioskUploadsBaseUrl());
}

export function getHomeImageUploadsBaseUrl(): string {
  return getKioskUploadsBaseUrl();
}

export function getHomeImageApiBaseUrl(): string {
  return getKioskApiBaseUrl();
}
