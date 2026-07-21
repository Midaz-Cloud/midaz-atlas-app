import { getKioskUploadsBaseUrl } from '@shared/config/api';

/**
 * Builds absolute image URL from API-relative path (`uploads/...`).
 * @see docs/KIOSK_DEVELOPER_GUIDE.md §6
 */
export function resolveKioskImageUrl(
  relativePath: string | null | undefined,
  uploadsBaseUrl: string = getKioskUploadsBaseUrl(),
): string | null {
  if (!relativePath) {
    return null;
  }
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const base = uploadsBaseUrl.replace(/\/+$/, '');
  const path = relativePath.replace(/^\/+/, '');
  return `${base}/${path}`;
}

/** @alias resolveKioskImageUrl */
export const getUploadsUrl = resolveKioskImageUrl;
