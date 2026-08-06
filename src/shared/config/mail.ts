import { getEnvString } from './env';

export type KioskMailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
  to: string;
};

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readMailEnv(key: string): string | undefined {
  const raw = getEnvString(key as any)?.trim();
  if (!raw) {
    return undefined;
  }
  return stripEnvQuotes(raw);
}

/**
 * SMTP settings for settlement emails.
 * Returns null when any critical field is missing (host/user/pass/to).
 */
export function getKioskMailConfig(): KioskMailConfig | null {
  const host = readMailEnv('KIOSK_MAIL_HOST');
  const user = readMailEnv('KIOSK_MAIL_USERNAME');
  const pass = readMailEnv('KIOSK_MAIL_PASSWORD');
  const to = readMailEnv('KIOSK_MAIL_TO');
  if (!host || !user || !pass || !to) {
    return null;
  }

  const portRaw = readMailEnv('KIOSK_MAIL_PORT');
  const port = Number.parseInt(portRaw || '465', 10);
  const encryption = (readMailEnv('KIOSK_MAIL_ENCRYPTION') || 'ssl').toLowerCase();
  const secure = encryption === 'ssl' || port === 465;
  const fromAddress = readMailEnv('KIOSK_MAIL_FROM_ADDRESS') || user;
  const fromName = readMailEnv('KIOSK_MAIL_FROM_NAME') || 'Panel Disglobal';

  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure,
    user,
    pass,
    fromAddress,
    fromName,
    to,
  };
}
