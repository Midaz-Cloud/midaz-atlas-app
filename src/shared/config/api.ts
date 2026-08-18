import Config from 'react-native-config';

import { getEnvString, parseBooleanEnv } from './env';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const defaultBase = 'http://localhost:3000';

/**
 * Midaz-Web origin for ticket QR (`{origin}/track/{shortCode}`).
 * Set `KIOSK_TRACK_BASE_URL` per environment. Unset falls back to localhost placeholder.
 */
const DEFAULT_TRACK_WEB_ORIGIN = 'http://localhost:8001';

function normalizeTrackWebOrigin(raw: string): string {
  return trimTrailingSlash(raw.trim()).replace(/\/track$/i, '');
}

export const kioskApiConfig = {
  get baseUrl(): string {
    return trimTrailingSlash(getEnvString('KIOSK_API_BASE_URL') ?? defaultBase);
  },
  get apiKey(): string {
    return getEnvString('KIOSK_API_KEY') ?? '';
  },
  get uploadsBaseUrl(): string {
    const uploads = getEnvString('KIOSK_UPLOADS_BASE_URL');
    const base = getEnvString('KIOSK_API_BASE_URL');
    return trimTrailingSlash(uploads ?? base ?? defaultBase);
  },
  get serialOverride(): string | undefined {
    return getEnvString('KIOSK_DEVICE_SERIAL_OVERRIDE');
  },
  get adminPasscode(): string | undefined {
    return getEnvString('KIOSK_ADMIN_PASSCODE');
  },
  get qrGeneratorUrl(): string {
    return getEnvString('KIOSK_QR_GENERATOR_URL' as any) ?? 'http://54.207.27.120:32820/generateQr/';
  },
  get trackBaseUrl(): string {
    const raw = getEnvString('KIOSK_TRACK_BASE_URL');
    return normalizeTrackWebOrigin(raw ?? DEFAULT_TRACK_WEB_ORIGIN);
  },
} as const;

/** Demo serial when device hardware id is unavailable. */
export const KIOSK_DEMO_SERIAL = 'AF910-DEMO-001';

export const KIOSK_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Mock API only when `KIOSK_API_USE_MOCK=true`.
 * Demo mode (`KIOSK_DEMO_MODE`) does not override this — use live config/images with
 * `KIOSK_API_USE_MOCK=false` in `.env` / `.env.demo`.
 */
export function shouldUseMockApi(): boolean {
  return parseBooleanEnv(Config.KIOSK_API_USE_MOCK);
}

export function getKioskApiKey(): string {
  return kioskApiConfig.apiKey;
}

export function getKioskApiBaseUrl(): string {
  return kioskApiConfig.baseUrl;
}

export function getKioskUploadsBaseUrl(): string {
  return kioskApiConfig.uploadsBaseUrl;
}

export function getKioskDeviceSerialOverride(): string | undefined {
  return kioskApiConfig.serialOverride;
}

export function getKioskAdminPasscode(): string | undefined {
  return kioskApiConfig.adminPasscode;
}

export function getKioskTrackBaseUrl(): string {
  return kioskApiConfig.trackBaseUrl;
}

export function getKioskQrGeneratorUrl(): string {
  // According to KIOSK_DEVELOPER_GUIDE-UPDATE-10.md, the QR generator is now a native endpoint
  // on our main API domain: POST /kiosk/generate-payment-qr
  return `${kioskApiConfig.baseUrl}/kiosk/generate-payment-qr`;
}

/** Bs sent to POS when `KIOSK_POS_TEST_CHARGE_VES` is set (e.g. 1 = 1.00 Bs → 100 on terminal). */
export function getKioskPosTestChargeVes(): number | undefined {
  const raw = getEnvString('KIOSK_POS_TEST_CHARGE_VES' as any);
  if (raw == null) {
    return undefined;
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function getKioskApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${kioskApiConfig.baseUrl}${normalized}`;
}
