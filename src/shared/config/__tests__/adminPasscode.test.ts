import { getKioskAdminPasscode } from '../api';

const mockGetEnvString = jest.fn();

jest.mock('../env', () => ({
  isKioskDemoMode: false,
  parseBooleanEnv: (value: string | undefined) => value === 'true',
  getEnvString: (key: string) => mockGetEnvString(key),
}));

describe('getKioskAdminPasscode', () => {
  beforeEach(() => {
    mockGetEnvString.mockReset();
  });

  it('returns undefined when KIOSK_ADMIN_PASSCODE is not set', () => {
    mockGetEnvString.mockReturnValue(undefined);
    expect(getKioskAdminPasscode()).toBeUndefined();
  });

  it('returns configured passcode when KIOSK_ADMIN_PASSCODE is set', () => {
    mockGetEnvString.mockReturnValue('987654');
    expect(getKioskAdminPasscode()).toBe('987654');
  });
});
