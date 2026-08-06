const mockGetEnvString = jest.fn();

jest.mock('../env', () => ({
  isKioskDemoMode: false,
  parseBooleanEnv: (value: string | undefined) => value === 'true',
  getEnvString: (key: string) => mockGetEnvString(key),
}));

import { getKioskMailConfig } from '../mail';

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
        KIOSK_MAIL_HOST: 'mail.dis-global.com',
        KIOSK_MAIL_PORT: '465',
        KIOSK_MAIL_USERNAME: 'midaz@dis-global.com',
        KIOSK_MAIL_PASSWORD: '"Hr$3m?uYn~Xu"',
        KIOSK_MAIL_ENCRYPTION: 'ssl',
        KIOSK_MAIL_FROM_ADDRESS: 'midaz@dis-global.com',
        KIOSK_MAIL_FROM_NAME: '"Panel Disglobal"',
        KIOSK_MAIL_TO: 'alex1812r@yopmail.com',
      };
      return map[key];
    });

    const config = getKioskMailConfig();
    expect(config).not.toBeNull();
    expect(config?.host).toBe('mail.dis-global.com');
    expect(config?.port).toBe(465);
    expect(config?.secure).toBe(true);
    expect(config?.user).toBe('midaz@dis-global.com');
    expect(config?.pass).toBe('Hr$3m?uYn~Xu');
    expect(config?.fromName).toBe('Panel Disglobal');
    expect(config?.to).toBe('alex1812r@yopmail.com');
  });
});
