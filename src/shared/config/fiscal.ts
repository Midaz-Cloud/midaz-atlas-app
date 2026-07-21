import Config from 'react-native-config';

import { getEnvString, parseBooleanEnv } from './env';

const DEFAULT_FISCAL_SERVICE_URL = 'http://127.0.0.1:8765';

export const fiscalServiceConfig = {
  get baseUrl(): string {
    const raw = getEnvString('KIOSK_FISCAL_SERVICE_URL' as any);
    const trimmed = raw?.trim();
    return (trimmed && trimmed.length > 0 ? trimmed : DEFAULT_FISCAL_SERVICE_URL).replace(
      /\/+$/,
      '',
    );
  },
} as const;

/** Skip real HTTP calls to HkaApp (emulator / CI). Literal `true` only. */
export function shouldUseMockFiscal(): boolean {
  return parseBooleanEnv(Config.KIOSK_FISCAL_MOCK as string | undefined);
}

export function getFiscalServiceBaseUrl(): string {
  return fiscalServiceConfig.baseUrl;
}
