const mockGetEnvString = jest.fn();

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../env', () => ({
  isKioskDemoMode: false,
  parseBooleanEnv: (value: string | undefined) => value === 'true',
  getEnvString: (key: string) => mockGetEnvString(key),
}));

import Config from 'react-native-config';

import { getKioskMailConfig, shouldSendSettlementExcelMail } from '../mail';

describe('shouldSendSettlementExcelMail', () => {
  beforeEach(() => {
    delete (Config as { KIOSK_SETTLEMENT_EXCEL_MAIL?: string }).KIOSK_SETTLEMENT_EXCEL_MAIL;
  });

  it('returns false when unset (default: skip Excel and mail)', () => {
    expect(shouldSendSettlementExcelMail()).toBe(false);
  });

  it('returns false for any value other than literal true', () => {
    (Config as { KIOSK_SETTLEMENT_EXCEL_MAIL?: string }).KIOSK_SETTLEMENT_EXCEL_MAIL = 'false';
    expect(shouldSendSettlementExcelMail()).toBe(false);
    (Config as { KIOSK_SETTLEMENT_EXCEL_MAIL?: string }).KIOSK_SETTLEMENT_EXCEL_MAIL = '1';
    expect(shouldSendSettlementExcelMail()).toBe(false);
  });

  it('returns true only when KIOSK_SETTLEMENT_EXCEL_MAIL is literal true', () => {
    (Config as { KIOSK_SETTLEMENT_EXCEL_MAIL?: string }).KIOSK_SETTLEMENT_EXCEL_MAIL = 'true';
    expect(shouldSendSettlementExcelMail()).toBe(true);
  });
});

describe('getKioskMailConfig', () => {
  beforeEach(() => {
    mockGetEnvString.mockReset();
  });

  it('returns null when required fields are missing', () => {
    mockGetEnvString.mockReturnValue(undefined);
    expect(getKioskMailConfig()).toBeNull();
  });

  it('returns config when host/user/pass/to are set', () => {
    mockGetEnvString.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        KIOSK_MAIL_HOST: 'mail.example.com',
        KIOSK_MAIL_PORT: '465',
        KIOSK_MAIL_USERNAME: 'noreply@example.com',
        KIOSK_MAIL_PASSWORD: '"quoted-smtp-pass"',
        KIOSK_MAIL_ENCRYPTION: 'ssl',
        KIOSK_MAIL_FROM_ADDRESS: 'noreply@example.com',
        KIOSK_MAIL_FROM_NAME: '"Panel Disglobal"',
        KIOSK_MAIL_TO: 'ops@example.com',
      };
      return map[key];
    });

    const config = getKioskMailConfig();
    expect(config).not.toBeNull();
    expect(config?.host).toBe('mail.example.com');
    expect(config?.port).toBe(465);
    expect(config?.secure).toBe(true);
    expect(config?.user).toBe('noreply@example.com');
    expect(config?.pass).toBe('quoted-smtp-pass');
    expect(config?.fromName).toBe('Panel Disglobal');
    expect(config?.to).toBe('ops@example.com');
  });
});
